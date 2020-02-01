const path = require('path');
import { Sheet, getSheet } from '../Sheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
import faker from 'faker';
import { SpreadsheetWorksheet } from '../SpreadsheetWorksheet';

const _ = require('lodash');
const docs: { [key: string]: Sheet } = {};
function getSheetName() { return 'test sheet' + (+new Date()); }

describe('Authentication', () => {
  beforeAll(() => {
    Object.keys(sheet_ids).forEach(function (key) {
      docs[key] = getSheet(sheet_ids[key], creds);
    });
  });

  describe('reading + getInfo', () => {
    test('getInfo should fail on a private doc', async () => {
      jest.setTimeout(1000 * 30)
      for (const sheet of Object.values(docs)) {
        try {
          const results = await sheet.query(0);
          expect(results).toBeDefined();

        } catch (error) {
          expect(false).toBeTruthy();
        }
      }
    });
  });

  describe('writing', () => {
    const email = faker.internet.email();
    let insertedRow: any;
    test('insert into private doc', async () => {
      const results = await docs['private'].insert(1, { email });
      insertedRow = results;
      expect(results).toBeDefined;
    });

    test('insert into private doc', async () => {
      const rows = [{ email: faker.internet.email() }, { email: faker.internet.email() }, { email: faker.internet.email() }]
      const results = await docs['private'].insertMany(2, rows);
      expect(results).toBeDefined;
    });

    test('remove from private doc', async () => {
      const results = await docs['private'].delete(1, insertedRow);
      expect(results.email).toBe(insertedRow.email);
    });
  });

  afterAll(() => {
    Object.keys(sheet_ids).forEach(async (key) => {

      docs[key].info.worksheets.forEach(async (worksheet: SpreadsheetWorksheet) => {
        const removeResult = await docs[key].doc.removeWorksheet(worksheet.id);
      });
    });
  });
});
