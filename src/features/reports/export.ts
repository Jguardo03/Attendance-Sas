import { Platform, Share } from 'react-native';

// Gives the person the CSV: a file download in the browser, the share sheet on a phone (as text, so it can go to
// Files, mail or a spreadsheet app).
export async function exportCsv(filename: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    // The leading byte order mark makes Excel read names with accents correctly.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: csv });
}
