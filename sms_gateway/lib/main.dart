import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:android_intent_plus/android_intent.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

// ---- Notification channel constants ----
const String _kChannelId   = 'sms_gateway_channel';
const String _kChannelName = 'SMS Gateway Service';

final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.dark);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  await initializeService(); // channel is created inside here now

  final prefs = await SharedPreferences.getInstance();
  final isDark = prefs.getBool('is_dark_mode') ?? true;
  themeNotifier.value = isDark ? ThemeMode.dark : ThemeMode.light;

  runApp(const SmsGatewayApp());
}

// -----------------------------------------------------------------------
// FIX: Create the notification channel BEFORE calling service.configure().
//      Without this, Android 13+ throws
//      CannotPostForegroundServiceNotificationException because
//      startForeground() references a channel that doesn't exist yet.
// -----------------------------------------------------------------------
Future<void> initializeService() async {
  // Step 1 – create the channel so it exists before the service posts to it.
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    _kChannelId,
    _kChannelName,
    description: 'Keeps the SMS gateway running in the background',
    importance: Importance.low, // low = silent, no sound/vibration
  );

  final FlutterLocalNotificationsPlugin flnp = FlutterLocalNotificationsPlugin();
  await flnp
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  // Step 2 – now it is safe to configure the background service.
  final service = FlutterBackgroundService();
  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: false,
      isForegroundMode: true,
      notificationChannelId: _kChannelId,   // must match the channel above
      initialNotificationTitle: 'Gateway is Active',
      initialNotificationContent: 'Listening for pending SMS...',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onStart,
    ),
  );
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  final supabase = Supabase.instance.client;

  final prefs = await SharedPreferences.getInstance();
  final apiKey = prefs.getString('api_key');
  final simSlot = prefs.getInt('sim_slot') ?? 0;

  if (apiKey == null || apiKey.isEmpty) {
    service.stopSelf();
    return;
  }

  const platform = MethodChannel('com.rzr.sms_gateway/sms');

  final pendingMessages = await supabase
      .from('messages')
      .select()
      .eq('api_key', apiKey)
      .eq('status', 'pending');

  for (var msg in pendingMessages) {
    await _processMessage(msg, platform, supabase, simSlot);
  }

  supabase.channel('public:messages').onPostgresChanges(
    event: PostgresChangeEvent.insert,
    schema: 'public',
    table: 'messages',
    filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq, column: 'api_key', value: apiKey),
    callback: (payload) async {
      final newMsg = payload.newRecord;
      if (newMsg['status'] == 'pending') {
        await _processMessage(newMsg, platform, supabase, simSlot);
      }
    },
  ).subscribe();

  service.on('stopService').listen((event) {
    service.stopSelf();
  });
}

Future<void> _processMessage(
  Map<String, dynamic> msg,
  MethodChannel platform, // kept for signature compatibility
  SupabaseClient supabase,
  int simSlot,
) async {
  try {
    debugPrint("📱 Sending SMS via Broadcast to: ${msg['phone_number']} via SIM $simSlot");

    // MethodChannel এর বদলে Android Broadcast Intent — ব্যাকগ্রাউন্ড isolate থেকেও কাজ করে
    final intent = AndroidIntent(
      action: 'com.rzr.sms_gateway.SEND_SMS',
      arguments: <String, dynamic>{
        'phone': msg['phone_number'],
        'message': msg['message'],
        'simSlot': simSlot.toString(),
      },
    );
    await intent.sendBroadcast();

    debugPrint("✅ SMS Broadcast Fired Successfully!");
    await supabase.from('messages').update({'status': 'sent'}).eq('id', msg['id']);
  } catch (e) {
    debugPrint("❌ SMS SEND ERROR: $e");
    await supabase.from('messages').update({'status': 'failed'}).eq('id', msg['id']);
  }
}

// -----------------------------------------------------------------------
// UI — unchanged from original
// -----------------------------------------------------------------------

class SmsGatewayApp extends StatelessWidget {
  const SmsGatewayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (_, ThemeMode currentMode, __) {
        return MaterialApp(
          title: 'SMS Gateway',
          debugShowCheckedModeBanner: false,
          themeMode: currentMode,
          theme: ThemeData(
            brightness: Brightness.light,
            scaffoldBackgroundColor: const Color(0xFFF5F5F7),
            primaryColor: const Color(0xFF0070F3),
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF0070F3),
              surface: Colors.white,
            ),
            fontFamily: 'Inter',
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            scaffoldBackgroundColor: const Color(0xFF0A0A0A),
            primaryColor: const Color(0xFF0070F3),
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF0070F3),
              surface: Color(0xFF111111),
            ),
            fontFamily: 'Inter',
            useMaterial3: true,
          ),
          home: const DashboardScreen(),
        );
      },
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _apiKeyController = TextEditingController();
  int _selectedSim = 0;
  bool _isServiceRunning = false;

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _loadSettings();
    _checkServiceStatus();
  }

  Future<void> _requestPermissions() async {
    await [Permission.sms, Permission.phone, Permission.notification].request();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _apiKeyController.text = prefs.getString('api_key') ?? '';
      _selectedSim = prefs.getInt('sim_slot') ?? 0;
    });
  }

  Future<void> _checkServiceStatus() async {
    final service = FlutterBackgroundService();
    bool isRunning = await service.isRunning();
    setState(() {
      _isServiceRunning = isRunning;
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_key', _apiKeyController.text.trim());
    await prefs.setInt('sim_slot', _selectedSim);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Configuration Saved'),
            backgroundColor: Colors.green),
      );
    }
  }

  void _toggleService() async {
    var status = await Permission.notification.status;
    if (!status.isGranted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Please enable Notifications from Settings to run the service!'),
            backgroundColor: Colors.red),
      );
      openAppSettings();
      return;
    }

    final service = FlutterBackgroundService();
    final supabase = Supabase.instance.client;
    final apiKey = _apiKeyController.text.trim();

    if (_isServiceRunning) {
      service.invoke("stopService");
      setState(() => _isServiceRunning = false);
      await supabase
          .from('devices')
          .update({'is_online': false}).eq('api_key', apiKey);
    } else {
      if (apiKey.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Please enter your Secret API Key'),
              backgroundColor: Colors.red),
        );
        return;
      }
      await _saveSettings();
      service.startService();
      setState(() => _isServiceRunning = true);

      // upsert: row না থাকলে নতুন create হবে, থাকলে শুধু update হবে
      try {
        final response = await supabase.from('devices').upsert({
          'api_key': apiKey,
          'user_id': supabase.auth.currentUser?.id ?? 'app_user',
          'is_online': true,
          'last_seen': DateTime.now().toIso8601String(),
        }).select();
        debugPrint("SUCCESS UPSERT: $response");
      } catch (e) {
        debugPrint("💥 DATABASE UPSERT ERROR: $e");
      }
    }
  }

  void _toggleTheme() async {
    final prefs = await SharedPreferences.getInstance();
    if (themeNotifier.value == ThemeMode.dark) {
      themeNotifier.value = ThemeMode.light;
      await prefs.setBool('is_dark_mode', false);
    } else {
      themeNotifier.value = ThemeMode.dark;
      await prefs.setBool('is_dark_mode', true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = themeNotifier.value == ThemeMode.dark;
    final surfaceColor = isDark ? const Color(0xFF1A1A1A) : Colors.white;
    final borderColor =
        isDark ? const Color(0xFF333333) : Colors.grey.shade300;
    final textColor = isDark ? Colors.white : Colors.black87;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gateway Dashboard',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
            onPressed: _toggleTheme,
            tooltip: 'Toggle Theme',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 30),
              decoration: BoxDecoration(
                color: surfaceColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: borderColor),
                boxShadow: isDark
                    ? []
                    : [
                        BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4))
                      ],
              ),
              child: Column(
                children: [
                  Container(
                    height: 80,
                    width: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isServiceRunning
                          ? Colors.green.withOpacity(0.2)
                          : Colors.redAccent.withOpacity(0.2),
                    ),
                    child: Icon(
                      _isServiceRunning ? Icons.cloud_done : Icons.cloud_off,
                      size: 40,
                      color:
                          _isServiceRunning ? Colors.green : Colors.redAccent,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _isServiceRunning ? 'Service is Active' : 'Service is Inactive',
                    style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: _isServiceRunning
                            ? Colors.green
                            : Colors.redAccent),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            Text('Configuration',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: textColor)),
            const SizedBox(height: 16),
            TextField(
              controller: _apiKeyController,
              obscureText: true,
              style: TextStyle(color: textColor),
              decoration: InputDecoration(
                labelText: 'Secret API Key',
                hintText: 'Paste your unique API key here',
                prefixIcon: const Icon(Icons.vpn_key_outlined),
                filled: true,
                fillColor: isDark
                    ? const Color(0xFF111111)
                    : Colors.grey.shade100,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor)),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF0070F3))),
              ),
            ),
            const SizedBox(height: 24),
            Text('Select Sending SIM',
                style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : Colors.black54)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: RadioListTile<int>(
                    title: Text('SIM 1', style: TextStyle(color: textColor)),
                    value: 0,
                    groupValue: _selectedSim,
                    activeColor: const Color(0xFF0070F3),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) =>
                        setState(() => _selectedSim = value!),
                  ),
                ),
                Expanded(
                  child: RadioListTile<int>(
                    title: Text('SIM 2', style: TextStyle(color: textColor)),
                    value: 1,
                    groupValue: _selectedSim,
                    activeColor: const Color(0xFF0070F3),
                    contentPadding: EdgeInsets.zero,
                    onChanged: (value) =>
                        setState(() => _selectedSim = value!),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: _saveSettings,
                style: OutlinedButton.styleFrom(
                    side: BorderSide(color: borderColor),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12))),
                child: Text('Save Configuration',
                    style: TextStyle(color: textColor)),
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _toggleService,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isServiceRunning
                      ? Colors.redAccent
                      : const Color(0xFF0070F3),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                    _isServiceRunning ? 'STOP SERVICE' : 'START SERVICE',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
