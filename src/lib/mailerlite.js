import { supabase } from '@/lib/supabase';

function getSubscriberStorageKey(userId) {
  return `mailerlite-subscriber:${userId}`;
}

function getUserDisplayName(user) {
  return (
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    ''
  );
}

export async function syncMailerLiteSubscriber(user) {
  if (!user?.id || !user?.email || typeof window === 'undefined') return false;

  const storageKey = getSubscriberStorageKey(user.id);

  if (window.localStorage.getItem(storageKey) === 'synced') {
    return true;
  }

  try {
    const { error } = await supabase.functions.invoke('mailerlite-subscribe', {
      body: {
        email: user.email,
        name: getUserDisplayName(user),
      },
    });

    if (error) throw error;

    window.localStorage.setItem(storageKey, 'synced');
    return true;
  } catch (error) {
    console.warn('No se pudo sincronizar el usuario con MailerLite', error);
    return false;
  }
}
