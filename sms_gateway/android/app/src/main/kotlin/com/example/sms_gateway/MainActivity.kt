package com.example.sms_gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.os.Build
import android.util.Log
import io.flutter.embedding.android.FlutterActivity

class MainActivity: FlutterActivity() {
}

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "com.rzr.sms_gateway.SEND_SMS") {
            val phone = intent.getStringExtra("phone")
            val message = intent.getStringExtra("message")
            val simSlotStr = intent.getStringExtra("simSlot")
            val simSlot = simSlotStr?.toIntOrNull() ?: 0

            if (phone != null && message != null) {
                sendSMSFromSpecificSim(context, phone, message, simSlot)
            }
        }
    }

    private fun sendSMSFromSpecificSim(context: Context, phone: String, message: String, simSlot: Int) {
        try {
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as SubscriptionManager
            val activeSubscriptionInfoList = subscriptionManager.activeSubscriptionInfoList

            // FIX: list index এর বদলে hardware simSlotIndex দিয়ে match করা হচ্ছে
            // 0 = physical SIM slot 1, 1 = physical SIM slot 2
            var subId = -1
            if (activeSubscriptionInfoList != null) {
                for (info in activeSubscriptionInfoList) {
                    if (info.simSlotIndex == simSlot) {
                        subId = info.subscriptionId
                        break
                    }
                }
            }

            val smsManager: SmsManager = if (subId != -1) {
                Log.d("SMS_GATEWAY", "Sending via SIM Slot: $simSlot (SubID: $subId)")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                } else {
                    SmsManager.getSmsManagerForSubscriptionId(subId)
                }
            } else {
                Log.d("SMS_GATEWAY", "SIM Slot $simSlot not found! Falling back to Default SIM.")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    context.getSystemService(SmsManager::class.java)
                } else {
                    SmsManager.getDefault()
                }
            }

            // FIX: sendTextMessage এর বদলে sendMultipartTextMessage
            // এটা বড় মেসেজ ভেঙে পাঠায় এবং silent drop রোধ করে
            val parts = smsManager.divideMessage(message)
            smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
            Log.d("SMS_GATEWAY", "SMS dispatched successfully to $phone")

        } catch (e: Exception) {
            Log.e("SMS_GATEWAY", "Error sending SMS: ${e.message}")
            e.printStackTrace()
        }
    }
}
