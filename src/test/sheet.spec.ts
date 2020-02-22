import faker from 'faker';
import { Sheet, getSheet, SheetDataResult } from '../Sheet';
import { sheet_ids } from './config';
import creds from './service-account-creds';
import { SpreadsheetRow } from '../SpreadsheetRow';

 
const docs: { [key: string]: Sheet } = {};

class SheetModel {
  email?: string;
  keyid?: string;
  fields: any[] = [];
  some?: any;
}

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
          const results = await sheet.query('test');
          expect(results).toBeDefined();

        } catch (error) {
          expect(false).toBeTruthy();
        }
      }
    });
  });

  describe('writing private doc', () => {
    const email = faker.internet.email();
    let insertedRow: any;
    let updatedRow: Partial<SheetModel>;
    describe('insert', () => {
      test('into new Sheet', async () => {
        const results = await docs['private'].insert<SheetModel>('test1', { email });
        expect(results.email).toBe(email);
        expect(results.keyid).toBeDefined();
        expect(results).toBeDefined();
      });

      test('simple', async () => {
        docs['private'].info = undefined;
        const results = await docs['private'].insert<SheetModel>('test', { email });
        expect(results.email).toBe(email);
        expect(results.keyid).toBeDefined();
        insertedRow = results;
        expect(results).toBeDefined();
      });

      test('many', async () => {
        docs['private'].info = undefined;
        const results = await docs['private'].insertMany<SheetModel>('test', [{ email }, { email }, { email }, { email }]);

        expect(results).toBeDefined();
        expect(results.length).toBe(4);
      });

      test('objects', async () => {
        docs['private'].info = undefined;
        const results = await docs['private'].insert<SheetModel>('test', { email, some: undefined, fields: [{ name: 'field1' }, { name: 'field2' }] });
        insertedRow = results;
        expect(results).toBeDefined();
        expect(results.keyid).toBeDefined();
      });

    });

    describe('update', () => {

      test('simple', async () => {
        insertedRow.email = faker.internet.email();
        updatedRow = await docs['private'].update('test', insertedRow);
        const results = await docs['private'].query('test');
        expect(updatedRow.email).toBe(insertedRow.email);
        return results;
      });

      test('objects', async () => {
        const email = faker.internet.email();
        updatedRow = await docs['private'].update('test', { keyid: insertedRow.keyid, email, some: undefined, fields: [{ name: 'field1' }, { name: 'field2' }] });
        const results = await docs['private'].query('test');
        expect(updatedRow.email).toBe(email);
        return results;
      });



      test('updateBy', async () => {

        const updatedResults = await docs['private'].query<SheetModel>('test', (row: SpreadsheetRow<SheetModel>) => row.data.email === insertedRow.email);
        const newEmail = faker.internet.email();
        const results: SheetDataResult<SheetModel> = await docs['private'].updateBy<SheetModel>('test', { email: newEmail },
          (row: SpreadsheetRow<SheetModel>) => {
            return row.data['email'] === updatedRow.email;
          });

        if (results.data.length) {
          expect(results.data[0].email).toBe(newEmail);
        } else {

          expect(true).toBeFalsy();
        }
        return updatedResults;
      });
    });



    test('remove from private doc', async () => {
      const results = await docs['private'].delete<SheetModel>('test', insertedRow);
      expect(results).toBeDefined();
    });






    test('deleteMany', async () => {
      const all = await docs['private'].query<SheetModel>('test', undefined, 0, 100, [{ colId: 'keyid', direction: 'asc' }]);
      const results = await docs['private'].deleteMany('test', all.data.map((row: any) => row.keyid));
      expect(results).toBeDefined();
      expect(results.length).toBe(all.data.length);
    });



    test('removeWorksheet', async () => {
      const info = docs['private'].info;
      if (info) {
        for (const worksheet of info.worksheets) {
          if (worksheet.title !== 'test') {
            const removeResult = await docs['private'].doc.removeWorksheet(worksheet.id);
            expect(removeResult.result).toBeDefined();
          }
        }
      }
    });
  });
});
