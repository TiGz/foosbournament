import { StoragePlugin, FoosballExport } from '../types';

export const jsonFilePlugin: StoragePlugin = {
  name: 'JSON File',

  async export(data: FoosballExport): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `foosbournament-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  },

  async import(): Promise<FoosballExport | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return resolve(null);

        const text = await file.text();
        try {
          const data = JSON.parse(text);
          resolve(data);
        } catch {
          resolve(null);
        }
      };

      // Handle cancel (no file selected)
      input.oncancel = () => resolve(null);

      input.click();
    });
  },
};
