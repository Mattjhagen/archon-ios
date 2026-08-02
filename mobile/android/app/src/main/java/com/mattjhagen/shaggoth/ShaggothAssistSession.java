package com.mattjhagen.shaggoth;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.service.voice.VoiceInteractionSession;

public class ShaggothAssistSession extends VoiceInteractionSession {
    public ShaggothAssistSession(Context context) {
        super(context);
    }

    @Override
    public void onShow(Bundle args, int showFlags) {
        super.onShow(args, showFlags);
        Intent intent = new Intent();
        intent.setClassName(
            getContext().getPackageName(),
            getContext().getPackageName() + ".MainActivity"
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("assistMode", true);
        getContext().startActivity(intent);
        hide();
    }
}
