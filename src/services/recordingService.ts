import { supabase, Recording } from '../lib/supabase';

export class RecordingService {
  static async saveRecording(
    audioBlob: Blob,
    duration: number,
    detectedKey: string = '',
    detectedMode: string = 'major'
  ): Promise<Recording | null> {
    try {
      console.log('Starting recording save process...');
      console.log('Blob size:', audioBlob.size, 'bytes');
      console.log('Blob type:', audioBlob.type);
      console.log('Duration:', duration, 'seconds');

      const timestamp = Date.now();
      const fileName = `recording-${timestamp}.webm`;
      console.log('Uploading file:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);

      const recordingData = {
        title: `Recording ${new Date(timestamp).toLocaleString()}`,
        audio_url: urlData.publicUrl,
        duration,
        detected_key: detectedKey,
        detected_mode: detectedMode,
        file_size: audioBlob.size,
      };

      console.log('Inserting record to database:', recordingData);

      const { data: recordData, error: insertError } = await supabase
        .from('recordings')
        .insert(recordingData)
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error details:', insertError);
        throw insertError;
      }

      console.log('Recording saved successfully to database:', recordData);
      return recordData;
    } catch (error) {
      console.error('Error saving recording:', error);
      return null;
    }
  }

  static async getAllRecordings(): Promise<Recording[]> {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllRecordings:', error);
      return [];
    }
  }

  static async deleteRecording(id: string, audioUrl: string): Promise<boolean> {
    try {
      const fileName = audioUrl.split('/').pop();

      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([fileName]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      return false;
    }
  }

  static async updateRecordingTitle(id: string, title: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recordings')
        .update({ title })
        .eq('id', id);

      if (error) {
        console.error('Error updating title:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in updateRecordingTitle:', error);
      return false;
    }
  }
}
