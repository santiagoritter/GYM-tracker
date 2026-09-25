package com.santiagoritter.gymtracker;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio, no un paquete de npm — Capacitor no lo autodescubre,
        // hay que registrarlo a mano y antes de super.onCreate (ahí es cuando
        // el bridge arranca a resolver los plugins que declara la web).
        registerPlugin(WorkoutNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
