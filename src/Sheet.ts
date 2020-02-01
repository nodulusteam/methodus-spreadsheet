
// const SystemCreds = process.env.CLIENT_SECRET ? JSON.parse(process.env.CLIENT_SECRET) : require('../../certs/client_secret.json');
import uuidv1 from 'uuid/v1';
import { GoogleSpreadsheet } from './GoogleSpreadsheet';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';

const SheetsCache: { [sheetId: string]: Sheet } = {};
export function getSheet(sheetId: string, creds: any) {
    if (!SheetsCache[sheetId]) {
        SheetsCache[sheetId] = new Sheet(sheetId, creds);
    }
    return SheetsCache[sheetId];
}


export type DataResult = {
    info: any;
    data: any[];
}
export class Sheet {
    private sheets: any = {};
    private credentials: any = {};
    private maps: any = {};
    private sheetsWithMeta: any = {};
    public info: any;
    public doc: GoogleSpreadsheet;


    constructor(sheetid: string, credentials?: any) {
        this.credentials = credentials;
        this.doc = new GoogleSpreadsheet(sheetid);

    }
    public async handleHeader(dataObject: { [key: string]: any }, sheet: number) {
        const finalObject: any = {};
        Object.keys(dataObject).forEach((key) => {
            finalObject[key] = dataObject[key];
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
    public async insert(sheet: number = 0, dataObject: any) {
        // Authenticate with the Google Spreadsheets API.

        await this.doc.useServiceAccountAuth(this.credentials);

        if (!this.info) {
            this.info = await this.doc.getInfo();

        }
        if (!this.info.worksheets[sheet]) {
            try {
                const newSheet = await this.doc.addWorksheet({
                    title: `Sheet ${this.info.worksheets.length + 1}`,
                    tabColor: {
                        "red": 1.0,
                        "green": 0.3,
                        "blue": 0.4
                    }
                });
                
                this.info.worksheets[sheet] = new SpreadsheetWorksheet(this.doc, newSheet.data);
            } catch (error) {
                throw new Error('Cannot create sheet');
            }

        }
        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);

        if (existingFields.indexOf('keyid') === -1) {
            existingFields.push('keyid');
        }
        finalObject.keyid = uuidv1();
        // await info.worksheets[sheet].setHeaderRow(existingFields);

        Object.keys(finalObject).forEach((property) => {
            if (finalObject[property] !== undefined && finalObject[property] !== null) {
                finalObject[property] = finalObject[property].toString();
            }
        });


        const insertedRow = await this.info.worksheets[sheet].addRow(finalObject, existingFields);
        // this.sheets[sheet].push({ index: this.info.worksheets[sheet].rowCount, data: finalObject });
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;


        return finalObject;
    }





    public async insertMany(sheet: number = 0, dataObject: any[]) {
        // Authenticate with the Google Spreadsheets API.

        await this.doc.useServiceAccountAuth(this.credentials);

        if (!this.info) {
            this.info = await this.doc.getInfo();

        }
        if (!this.info.worksheets[sheet]) {
            try {
                const newSheet = await this.doc.addWorksheet({
                    title: `Sheet ${this.info.worksheets.length + 1}`,
                    tabColor: {
                        "red": 1.0,
                        "green": 0.3,
                        "blue": 0.4
                    }
                });
                this.info.worksheets[sheet] = newSheet;
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




        const insertedRow = await this.info.worksheets[sheet].addRows(finalObject, existingFields);
        // this.sheets[sheet].push({ index: this.info.worksheets[sheet].rowCount, data: finalObject });
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;


        return finalObject;
    }



    public async delete(sheet: number = 0, dataObject: any, ) {
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

    public async update(sheet: number = 0, dataObject: any) {

        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();
        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);

        // Authenticate with the Google Spreadsheets API.
        const row = this.sheets[sheet].filter((rowData: any) => {
            if (rowData.data) {
                return rowData.data['keyid'] === dataObject['keyid'];
            }
            return false;
        });
        Object.assign(row[0].data, dataObject);

        const result = await this.doc.worksheets[sheet].updateRow(row[0].index, row[0].data, existingFields);
        return result;
    }



    public async updateBy(dataObject: any, filter: Function, sheet: number = 0) {
        // Authenticate with the Google Spreadsheets API.
        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();
        const [finalObject, existingFields] = await this.handleHeader(dataObject, sheet);
        // Authenticate with the Google Spreadsheets API.
        const row = this.sheets[sheet].filter(filter);
        Object.assign(row[0].data, dataObject);
        const result = await this.doc.worksheets[sheet].updateRow(row[0].index, row[0].data, existingFields);
        return result;

    }


    public errorHandler(error: Error, reject: Function) {
        return reject(new Error(error.message));
    }

    public async fulltextSearch(sheet: number, text: string, sorts?: any) {
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

    private intervals: { [key: string]: any } = {};
    private loaded: { [key: string]: boolean } = {};
    public async query(sheet: number, query?: Function, start: number = 0, end: number = 9, sorts?: any) {

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

            let resultObject = {
                info: this.info, data: []
            }

            if (query) {
                if (this.sheets[sheet]) {
                    resultObject.data = this.sheets[sheet].map((d: any) => { return Object.assign({}, d.data); }).filter(query).sort((a: any, b: any) => {
                        return (a[sortField] > b[sortField]) ? -1 * reverse : 1 * reverse
                    });
                }
            } else {
                resultObject.data = this.sheets[sheet].map((d: any) => { return Object.assign({}, d.data); }).sort((a: any, b: any) => {
                    return (a[sortField] > b[sortField]) ? 1 * reverse : -1 * reverse
                });
            }

            resultObject.data = resultObject.data.slice(start, end);
            return resultObject;

        } catch (error) {
            return ({ info: this.info, data: [] });
        }
    }
}