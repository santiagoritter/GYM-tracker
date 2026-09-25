package com.santiagoritter.gymtracker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Equivalente Android de la Live Activity de iOS
 * (`ios/App/App/LiveActivityPlugin.swift`): el descanso y el entreno en
 * curso como una notificación persistente con cronómetro nativo
 * (`setUsesChronometer`), en vez de un texto que la app tendría que
 * actualizar ella misma cada segundo.
 *
 * Sin foreground service: es solo una notificación de baja importancia que
 * se posta y se actualiza puntualmente (start/update/end), igual que
 * ActivityKit del lado de iOS. El nombre del plugin (`GymTrackerLiveActivity`)
 * tiene que coincidir EXACTO con el de `src/lib/liveActivity.ts` — Capacitor
 * lo resuelve por nombre, no por tipo.
 *
 * Correr (`startRun`/`updateRun`/`endRun`) es intencionalmente no-op: el
 * plugin `@capacitor-community/background-geolocation` ya deja su propia
 * notificación persistente (esa sí con foreground service, obligatoria para
 * trackear con la pantalla apagada) — una segunda acá sería duplicada.
 */
@CapacitorPlugin(name = "GymTrackerLiveActivity")
public class WorkoutNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "workout_status";
    private static final int NOTIF_ID_REST = 9101;
    private static final int NOTIF_ID_WORKOUT = 9102;

    /** Ventana en la que la notificación de "descanso terminado" se queda
     * visible antes de cerrarse sola, como la Live Activity de iOS. */
    private static final long FINISH_REST_AUTO_DISMISS_MS = 8000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable pendingFinishRestDismiss;

    private long workoutStartedAt = 0;
    private String workoutName = null;

    @Override
    public void load() {
        createChannelIfNeeded();
        // La app puede haber muerto con una notificación nuestra todavía
        // posteada (el SO las persiste, no nosotros) — al arrancar de nuevo
        // no hay estado real en memoria para esa notificación huérfana, así
        // que se limpia. Si el descanso/entreno sigue activo de verdad, el
        // store de JS vuelve a llamar a start*() enseguida.
        NotificationManagerCompat.from(getContext()).cancel(NOTIF_ID_REST);
        NotificationManagerCompat.from(getContext()).cancel(NOTIF_ID_WORKOUT);
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Entreno en curso",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Descanso y entreno en curso — se actualiza sola, sin sonido.");
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private boolean notificationsEnabled() {
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private PendingIntent contentIntent() {
        Context context = getContext();
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, 0, intent, flags);
    }

    private NotificationCompat.Builder baseBuilder() {
        return new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_repe)
            .setColor(0xFFE8FF47) // acento lima, mismo que LocalNotifications en capacitor.config.ts
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent())
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH);
    }

    private void notify(int id, NotificationCompat.Builder builder) {
        NotificationManagerCompat.from(getContext()).notify(id, builder.build());
    }

    private void cancelPendingFinishRestDismiss() {
        if (pendingFinishRestDismiss != null) {
            handler.removeCallbacks(pendingFinishRestDismiss);
            pendingFinishRestDismiss = null;
        }
    }

    @PluginMethod
    public void startRest(PluginCall call) {
        cancelPendingFinishRestDismiss();
        if (!notificationsEnabled()) {
            call.resolve();
            return;
        }
        long endsAt = call.getLong("endsAt", 0L);
        String exerciseName = call.getString("exerciseName");
        String title = exerciseName != null ? "Descanso · " + exerciseName : "Descanso";

        NotificationCompat.Builder builder = baseBuilder()
            .setContentTitle(title)
            .setContentText("Volvés en un toque")
            .setOngoing(true)
            .setAutoCancel(false)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setWhen(endsAt);
        notify(NOTIF_ID_REST, builder);
        call.resolve();
    }

    @PluginMethod
    public void finishRest(PluginCall call) {
        cancelPendingFinishRestDismiss();
        if (!notificationsEnabled()) {
            call.resolve();
            return;
        }
        String exerciseName = call.getString("exerciseName");
        String text = exerciseName != null ? "Seguís con " + exerciseName : "Volvé al peso";

        NotificationCompat.Builder builder = baseBuilder()
            .setContentTitle("Descanso terminado")
            .setContentText(text)
            .setOngoing(false)
            .setAutoCancel(true)
            .setUsesChronometer(false);
        notify(NOTIF_ID_REST, builder);

        pendingFinishRestDismiss = () -> {
            NotificationManagerCompat.from(getContext()).cancel(NOTIF_ID_REST);
            pendingFinishRestDismiss = null;
        };
        handler.postDelayed(pendingFinishRestDismiss, FINISH_REST_AUTO_DISMISS_MS);
        call.resolve();
    }

    @PluginMethod
    public void endRest(PluginCall call) {
        cancelPendingFinishRestDismiss();
        NotificationManagerCompat.from(getContext()).cancel(NOTIF_ID_REST);
        call.resolve();
    }

    @PluginMethod
    public void startWorkout(PluginCall call) {
        workoutName = call.getString("name", "Entrenamiento");
        workoutStartedAt = call.getLong("startedAt", System.currentTimeMillis());
        if (!notificationsEnabled()) {
            call.resolve();
            return;
        }
        NotificationCompat.Builder builder = baseBuilder()
            .setContentTitle(workoutName)
            .setContentText("Entrenamiento en curso")
            .setOngoing(true)
            .setAutoCancel(false)
            .setUsesChronometer(true)
            .setChronometerCountDown(false)
            .setWhen(workoutStartedAt);
        notify(NOTIF_ID_WORKOUT, builder);
        call.resolve();
    }

    @PluginMethod
    public void updateWorkout(PluginCall call) {
        if (!notificationsEnabled()) {
            call.resolve();
            return;
        }
        // Puede llegar antes que `startWorkout` termine de resolver del lado
        // JS (llamadas async en paralelo): sin una base propia, arranca el
        // cronómetro desde ahora en vez de perder la notificación.
        long startedAt = workoutStartedAt != 0 ? workoutStartedAt : System.currentTimeMillis();
        String title = workoutName != null ? workoutName : "Entrenamiento";
        String exerciseName = call.getString("exerciseName");
        Integer setsDone = call.getInt("setsDone", 0);
        Integer setsTotal = call.getInt("setsTotal", 0);

        String text;
        if (setsTotal != null && setsTotal > 0) {
            text = "Serie " + setsDone + "/" + setsTotal;
            if (exerciseName != null) text += " · " + exerciseName;
        } else if (exerciseName != null) {
            text = exerciseName;
        } else {
            text = "Entrenamiento en curso";
        }

        NotificationCompat.Builder builder = baseBuilder()
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setAutoCancel(false)
            .setUsesChronometer(true)
            .setChronometerCountDown(false)
            .setWhen(startedAt);
        notify(NOTIF_ID_WORKOUT, builder);
        call.resolve();
    }

    @PluginMethod
    public void endWorkout(PluginCall call) {
        workoutStartedAt = 0;
        workoutName = null;
        NotificationManagerCompat.from(getContext()).cancel(NOTIF_ID_WORKOUT);
        call.resolve();
    }

    // Correr ya tiene la notificación persistente del foreground service de
    // ubicación (@capacitor-community/background-geolocation) — estos tres
    // quedan no-op a propósito para no duplicarla. Están acá (en vez de
    // ausentes) para que `liveActivity.ts` use la misma API en las tres
    // plataformas sin un `if (platform === ...)` extra en cada call site.
    @PluginMethod
    public void startRun(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void updateRun(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void endRun(PluginCall call) {
        call.resolve();
    }
}
