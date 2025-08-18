const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "128tqEErdDvs7cWwtSbRl69aRj2cHaBFlebPBDjHmDQ";
    this.sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Feuille 1';
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      // Vérification des variables d'environnement
      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID manquant dans .env');
      }

      this.auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
          private_key_id: process.env.GOOGLE_SHEETS_PRIVATE_KEY_ID,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          client_id: process.env.GOOGLE_SHEETS_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.GOOGLE_SHEETS_CLIENT_X509_CERT_URL
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });

      // Vérification de l'accès
      await this.testAccess();
      
      return { success: true };
    } catch (error) {
      console.error('Erreur initialisation Google Sheets:', error);
      throw error;
    }
  }

  async testAccess() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'properties.title,sheets.properties'
      });
      console.log('Accès vérifié à:', response.data.properties.title);
      console.log('Feuilles disponibles:', 
        response.data.sheets.map(s => s.properties.title));
    } catch (error) {
      console.error('Erreur vérification accès:', error.message);
      throw new Error(`Accès refusé au Google Sheet. Vérifiez: 
        1. L'ID du spreadsheet
        2. Le compte de service a bien accès
        3. La feuille existe dans le document`);
    }
  }

  async getData() {
    try {
      if (!this.sheets) await this.initialize();

      const range = `${this.sheetName}!A:Z`;
      console.log(`Tentative de lecture: ${range}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Erreur récupération données:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();