import fs from 'fs';
import path from 'path';

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  size: number;
}

export class GoogleDriveService {
  private activeAccessToken: string | null = null;

  public setActiveToken(token: string | null) {
    if (token) {
      this.activeAccessToken = token;
    }
  }

  public getActiveToken(): string | null {
    return this.activeAccessToken;
  }

  /**
   * Search for a folder by name inside an optional parent folder, or create it if missing
   */
  public async ensureFolder(token: string, folderName: string, parentId?: string): Promise<string> {
    try {
      let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
      const res = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google Drive folder search error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      // Folder doesn't exist, create it
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined
        })
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Google Drive folder create error (${createRes.status}): ${errText}`);
      }

      const createdFolder = await createRes.json();
      return createdFolder.id;
    } catch (err: any) {
      console.error(`[GoogleDrive] Failed ensuring folder "${folderName}":`, err.message);
      throw err;
    }
  }

  /**
   * Builds the compliance folder tree:
   * Inject Care Trade Compliance/
   *   Licences/
   *     [Licence Number]/
   *       Licence/ (for licence documents)
   *       Imports/
   *         [Import Invoice Number]/
   *       Exports/
   *         [Export Invoice Number]/
   */
  public async getTargetFolder(
    token: string,
    params: {
      licenceNumber: string;
      docTypeCategory: 'Licence' | 'Import' | 'Export';
      invoiceNumber?: string;
    }
  ): Promise<string> {
    // 1. Root folder
    const rootFolderId = await this.ensureFolder(token, 'Inject Care Trade Compliance');
    // 2. Licences folder
    const licencesFolderId = await this.ensureFolder(token, 'Licences', rootFolderId);
    // 3. Licence Number folder
    const safeLicenceNumber = (params.licenceNumber || 'UNASSIGNED_LICENCE').trim();
    const licenceFolderId = await this.ensureFolder(token, safeLicenceNumber, licencesFolderId);

    // 4. Subfolders according to document classification
    if (params.docTypeCategory === 'Licence') {
      return await this.ensureFolder(token, 'Licence', licenceFolderId);
    } else if (params.docTypeCategory === 'Import') {
      const importsFolderId = await this.ensureFolder(token, 'Imports', licenceFolderId);
      const safeInvoice = (params.invoiceNumber || 'IMP_UNASSIGNED').replace(/[\/\\]/g, '_').trim();
      return await this.ensureFolder(token, safeInvoice, importsFolderId);
    } else {
      const exportsFolderId = await this.ensureFolder(token, 'Exports', licenceFolderId);
      const safeInvoice = (params.invoiceNumber || 'EXP_UNASSIGNED').replace(/[\/\\]/g, '_').trim();
      return await this.ensureFolder(token, safeInvoice, exportsFolderId);
    }
  }

  /**
   * Upload file to target Google Drive folder using multipart upload
   */
  public async uploadFile(
    token: string,
    folderId: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<DriveUploadResult> {
    const boundary = '-------ComplianceDriveBoundary' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: mimeType || 'application/pdf'
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || 'application/pdf'}\r\n\r\n`
      ),
      buffer,
      Buffer.from(closeDelimiter)
    ]);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartRequestBody.length.toString()
        },
        body: multipartRequestBody
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive file upload failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      name: data.name || fileName,
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
      webContentLink: data.webContentLink,
      size: Number(data.size) || buffer.length
    };
  }

  /**
   * Download file content from Google Drive
   */
  public async downloadFile(token: string, driveFileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive download error (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/pdf';
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType
    };
  }

  /**
   * Delete file from Google Drive
   */
  public async deleteFile(token: string, driveFileId: string): Promise<void> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok && res.status !== 404) {
      const errText = await res.text();
      throw new Error(`Google Drive delete error (${res.status}): ${errText}`);
    }
  }

  /**
   * Get file metadata
   */
  public async getMetadata(token: string, driveFileId: string) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,webViewLink,size,mimeType`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      return null;
    }
    return await res.json();
  }
}

export const googleDriveService = new GoogleDriveService();
