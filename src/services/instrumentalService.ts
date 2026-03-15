import { supabase, Instrumental } from '../lib/supabase';

export class InstrumentalService {
  static async saveInstrumental(
    audioBlob: Blob,
    title: string,
    duration: number,
    tempo: number = 120,
    key: string = ''
  ): Promise<Instrumental | null> {
    try {
      console.log('Starting instrumental save process...');
      const timestamp = Date.now();
      const fileName = `instrumental-${timestamp}.webm`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      const instrumentalData = {
        title: title || `Instrumental ${new Date(timestamp).toLocaleString()}`,
        audio_url: urlData.publicUrl,
        duration,
        tempo,
        key,
        file_size: audioBlob.size,
      };

      const { data: recordData, error: insertError } = await supabase
        .from('instrumentals')
        .insert(instrumentalData)
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log('Instrumental saved successfully:', recordData);
      return recordData;
    } catch (error) {
      console.error('Error saving instrumental:', error);
      return null;
    }
  }

  static async getAllInstrumentals(): Promise<Instrumental[]> {
    try {
      const { data, error } = await supabase
        .from('instrumentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching instrumentals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting instrumentals:', error);
      return [];
    }
  }

  static async deleteInstrumental(id: string, audioUrl: string): Promise<boolean> {
    try {
      const fileName = audioUrl.split('/').pop();
      if (fileName) {
        const { error: deleteStorageError } = await supabase.storage
          .from('recordings')
          .remove([fileName]);

        if (deleteStorageError) {
          console.error('Error deleting from storage:', deleteStorageError);
        }
      }

      const { error: deleteDbError } = await supabase
        .from('instrumentals')
        .delete()
        .eq('id', id);

      if (deleteDbError) {
        console.error('Error deleting from database:', deleteDbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting instrumental:', error);
      return false;
    }
  }

  static async updateInstrumentalTitle(id: string, title: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('instrumentals')
        .update({ title })
        .eq('id', id);

      if (error) {
        console.error('Error updating title:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating instrumental:', error);
      return false;
    }
  }

  static async updateInstrumentalMetadata(
    id: string,
    metadata: { tempo?: number; key?: string }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('instrumentals')
        .update(metadata)
        .eq('id', id);

      if (error) {
        console.error('Error updating metadata:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating instrumental metadata:', error);
      return false;
    }
  }
}
