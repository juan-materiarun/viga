'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Card from '../components/Card';
import Button from '../components/Button';
import InfoTooltip from '../components/InfoTooltip';
import Loader from '../components/Loader';
import { Sun, Moon, Globe, Save, Upload } from 'lucide-react';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_name: companyName })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setMessage('✅ CAMBIOS GUARDADOS');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setMessage('❌ ERROR AL GUARDAR');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setMessage('✅ FOTO ACTUALIZADA');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage('❌ ERROR AL SUBIR FOTO');
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">
        {t('settings.title')}
      </h1>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Message */}
        {message && (
          <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)] text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{message}</p>
          </div>
        )}

        {/* Apariencia */}
        <Card>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            {t('settings.appearance')}
            <InfoTooltip text="Personaliza la apariencia de VIGA cambiando el tema y el idioma de la interfaz." />
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                {t('settings.theme')}
              </label>
              <div className="flex gap-3">
                <Button
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className="flex-1"
                >
                  <Moon size={16} />
                  {t('settings.dark')}
                </Button>
                <Button
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className="flex-1"
                >
                  <Sun size={16} />
                  {t('settings.light')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Idioma */}
        <Card>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Globe size={20} />
            {t('settings.language')}
          </h2>

          <div className="flex gap-3">
            <Button
              variant={language === 'es' ? 'primary' : 'secondary'}
              onClick={() => language !== 'es' && toggleLanguage()}
              className="flex-1"
            >
              🇪🇸 ESPAÑOL
            </Button>
            <Button
              variant={language === 'en' ? 'primary' : 'secondary'}
              onClick={() => language !== 'en' && toggleLanguage()}
              className="flex-1"
            >
              🇬🇧 ENGLISH
            </Button>
          </div>
        </Card>

        {/* Organización */}
        <Card>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            {t('settings.organization')}
            <InfoTooltip text="Configura el nombre de tu organización y la foto de perfil que se mostrará en el sidebar." />
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                NOMBRE DE LA ORGANIZACIÓN
              </label>
              <input
                type="text"
                className="input no-uppercase"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nombre de la organización"
              />
            </div>
          </div>
        </Card>

        {/* Perfil */}
        <Card>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            {t('settings.profile')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="px-4 py-2 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-color)] hover:bg-[var(--accent-primary)] hover:text-white transition-all text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Upload size={16} />
                  CAMBIAR FOTO
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                EMAIL
              </label>
              <input
                type="email"
                className="input no-uppercase"
                value={user?.email || ''}
                disabled
                placeholder="Email"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                El email no se puede cambiar
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader size="small" /> : <><Save size={20} />{t('common.save')}</>}
          </Button>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © 2026 VIGA by <span className="font-bold text-[var(--accent-primary)]">MATERIA</span>. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}