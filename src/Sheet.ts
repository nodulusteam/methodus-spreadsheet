import uuidv1 from 'uuid/v1';
import { GoogleSpreadsheet, Credentials, SheetInfo } from './GoogleSpreadsheet';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';
import { SpreadsheetRow } from './SpreadsheetRow';

const SheetsCache: { [sheetId: string]: Sheet } = {};

export function getSheet(sheetId: string, creds: Credentials) {
    if (!SheetsCache[sheetId]) {
        SheetsCache[sheetId] = new Sheet(sheetId, creds);
    }
    return SheetsCache[sheetId];
}

export type DataResult<Model> = {
    info?: SheetInfo;
    data: Model[];

}

export class Sheet {
    private sheets: any = {};
    private credentials: any = {};
    public info?: SheetInfo;
    public doc: GoogleSpreadsheet;
    private intervals: { [key: string]: any } = {};
    private loaded: { [key: string]: boolean } = {};

    constructor(sheetid: string, credentials?: Credentials) {
        this.credentials = credentials;
        this.doc = new GoogleSpreadsheet(sheetid);

    }
    public async handleHeader<Model>(dataObject: Model, sheet: string) {
        const finalObject: any = {};
        Object.keys(dataObject).forEach((key) => {
            finalObject[key] = (dataObject as any)[key];
        });

        let existingFields: string[] = [];

        try {
            const headerRow = await this.doc.worksheets[sheet].getHeaderRow({});
            existingFields = headerRow.data || [];
        } catch (error) {

        }

        Object.keys(finalObject).forEach((key) => {
            if (existingFields.indexOf(key) === -1) {
                existingFields.push(key);
            }
        });
        return [finalObject, existingFields];
    }
    public async insert(sheet: string, dataObject: any) {
        // Authenticate with the Google Spreadsheets API.

        await this.doc.useServiceAccountAuth(this.credentials);

        if (!this.info) {
            this.info = await this.doc.getInfo();

        }
        if (!this.doc.worksheets[sheet]) {
            try {

                const newSheet = await this.doc.addWorksheet({
                    title: `${sheet}`,
                    tabColor: {

                    }
                });

                this.doc.worksheets[sheet] = new SpreadsheetWorksheet(this.doc, newSheet.data);

            } catch (error) {
                throw new Error('Cannot create sheet');
            }
        }

        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);

        if (existingFields.indexOf('keyid') === -1) {
            existingFields.push('keyid');
        }
        finalObject.keyid = uuidv1();

        Object.keys(finalObject).forEach((property) => {
            if (finalObject[property] !== undefined && finalObject[property] !== null) {
                finalObject[property] = finalObject[property].toString();
            }
        });


        const insertedRow = await this.doc.worksheets[sheet].addRow(finalObject, existingFields);
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;

        return finalObject;
    }





    public async insertMany(sheet: string, dataObject: any[]) {
        // Authenticate with the Google Spreadsheets API.

        await this.doc.useServiceAccountAuth(this.credentials);

        if (!this.info) {
            this.info = await this.doc.getInfo();

        }
        if (!this.doc.worksheets[sheet]) {
            try {
                const newSheet = await this.doc.addWorksheet({
                    title: `${sheet}`,
                    tabColor: {

                    }
                });
                this.doc.worksheets[sheet] = newSheet;
            } catch (error) {
                throw new Error('Cannot create sheet');
            }

        }

        let [finalObject, existingFields] = await this.handleHeader(dataObject[0], sheet);
        finalObject = dataObject;
        if (existingFields.indexOf('keyid') === -1) {
            existingFields.push('keyid');
        }

        finalObject.forEach((row: any) => {
            row.keyid = uuidv1();
            Object.keys(row).forEach((property) => {
                if (row[property] !== undefined && row[property] !== null) {
                    row[property] = row[property].toString();
                }
            });
        });




        const insertedRow = await this.doc.worksheets[sheet].addRows(finalObject, existingFields);
        // this.sheets[sheet].push({ index: this.info.worksheets[sheet].rowCount, data: finalObject });
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;


        return finalObject;
    }



    public async delete(sheet: string, dataObject: Partial<{ keyid: string }>) {
        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();

        //this.errorHandler(err, reject);
        const data = await this.doc.worksheets[sheet].getRows({});
        this.sheets[sheet] = data;

        // Authenticate with the Google Spreadsheets API.
        const row = this.sheets[sheet].filter((rowData: any) => {
            return rowData.data['keyid'] === dataObject['keyid'];
        });

        await row[0].del();
        const result = row[0].data;
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;
        return result;
    }

    public async update<Model>(sheet: string, dataObject: Partial<Model>) {

        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();
        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);

        // Authenticate with the Google Spreadsheets API.
        const row = this.sheets[sheet].filter((rowData: any) => {
            if (rowData.data) {
                return rowData.data['keyid'] === (dataObject as any)['keyid'];
            }
            return false;
        });
        Object.assign(row[0].data, dataObject);

        const result = await this.doc.worksheets[sheet].updateRow(row[0].index, row[0].data, existingFields);
        return result;
    }



    public async updateBy<Model>(sheet: string, dataObject: Partial<Model>, filter: (row: SpreadsheetRow<Model>) => {}): Promise<DataResult<Model>> {
        // Authenticate with the Google Spreadsheets API.
        await this.doc.useServiceAccountAuth(this.credentials);
        debugger;
        const info = await this.doc.getInfo();
        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);
        // Authenticate with the Google Spreadsheets API.
        const row = this.sheets[sheet].filter(filter);
        if (row.length > 0) {
            Object.assign(row[0].data, dataObject);
            const updateResult = await this.doc.worksheets[sheet].updateRow<Model>(row[0].index, row[0].data, existingFields);
            return { data: [updateResult.data] };
        } else {
            return { data: [] };
        }
    }


    public errorHandler(error: Error, reject: Function) {
        return reject(new Error(error.message));
    }

    public async fulltextSearch(sheet: string, text: string, start: number = 0, end: number = 9, sorts?: any) {
        await this.doc.useServiceAccountAuth(this.credentials);
        if (!this.info) {
            this.info = await this.doc.getInfo();
        }
        const data = await this.doc.worksheets[sheet].getRows({

        });
        this.sheets[sheet] = data;

        if (text) {
            if (this.sheets[sheet]) {
                const result = {
                    info: this.info,
                    data: this.sheets[sheet].filter((d: any) => {
                        return JSON.stringify(d.data).toLowerCase().indexOf(text.toLowerCase()) > -1;
                    }).map((d: any) => {
                        return d.data;
                    })
                }
                return result;
            }
        }
    }


    public async query<Model>(sheet: string, query?: (row: SpreadsheetRow<Model>) => {},
        start: number = 0, end: number = 9, sorts?: any): Promise<DataResult<Model>> {

        try {
            const ready = new Promise(async (resolve, reject) => {
                if (!this.loaded[sheet]) {
                    this.sheets[sheet] = [];
                    await this.doc.useServiceAccountAuth(this.credentials);
                    this.info = await this.doc.getInfo();

                    if (!this.doc.worksheets[sheet]) {
                        return reject({ info: this.info, data: [] });
                    }

                    this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
                    this.loaded[sheet] = true;
                    return resolve();
                } else {
                    if (!this.sheets[sheet]) {
                        //wait for completetion before result
                        this.intervals[sheet] = setInterval(() => {
                            if (this.sheets[sheet]) {
                                clearInterval(this.intervals[sheet]);
                                resolve();
                            }
                        }, 300);
                    } else {
                        resolve();
                    }
                }

            });

            let reverse = 1;
            let sortField = 'id';
            if (sorts && sorts.length > 0) {
                reverse = (sorts[0].sort !== 'asc') ? -1 : 1;
                sortField = sorts[0].colId;
            }

            await ready;

            let resultObject: { info: SheetInfo, data: Model[] } = {
                info: this.info!, data: []
            }

            if (query) {
                if (this.sheets[sheet]) {
                    resultObject.data = this.sheets[sheet].filter(query).sort((a: SpreadsheetRow<Model>, b: SpreadsheetRow<Model>) => {
                        return ((a.data as any)[sortField] > (b.data as any)[sortField]) ? -1 * reverse : 1 * reverse
                    }).map((d: SpreadsheetRow<Model>) => d.data);
                }
            } else {
                resultObject.data = this.sheets[sheet].sort((a: SpreadsheetRow<Model>, b: SpreadsheetRow<Model>) => {
                    return ((a.data as any)[sortField] > (b.data as any)[sortField]) ? 1 * reverse : -1 * reverse
                }).map((d: SpreadsheetRow<Model>) => d.data);
            }


            resultObject.data = resultObject.data.slice(start, end);
            return resultObject;

        } catch (error) {
            return ({ info: this.info, data: [] });
        }
    }
}