import uuidv1 from 'uuid/v1';
import { GoogleSpreadsheet, Credentials, SheetInfo, PagingInfo } from './GoogleSpreadsheet';
import { SpreadsheetWorksheet } from './SpreadsheetWorksheet';
import { SpreadsheetRow } from './SpreadsheetRow';

const SheetsCache: { [sheetId: string]: Sheet } = {};

export function getSheet(sheetId: string, creds: Credentials) {
    if (!SheetsCache[sheetId]) {
        SheetsCache[sheetId] = new Sheet(sheetId, creds);
    }
    return SheetsCache[sheetId];
}

export class SheetDataResult<Model> {
    constructor(data: Model[], ) {
        this.data = data;
    }
    public info?: PagingInfo;
    public data: Model[];
}

export class SortRequest {
    colId: string = '';
    direction: 'asc' | 'desc' = 'asc';
}

interface Key {
    keyid: string;
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
    private prepareObject(finalObject: { [key: string]: any } | any) {
        Object.keys(finalObject).forEach((property) => {
            if (finalObject[property] !== undefined && finalObject[property] !== null) {
                if (typeof finalObject[property] === 'object') {
                    finalObject[property] = JSON.stringify(finalObject[property]);
                } else {
                    finalObject[property] = finalObject[property].toString();
                }
            }
        });
        return finalObject;

    }

    private async handleHeader<Model>(dataObject: Partial<Model>, sheet: string): Promise<{ data: Partial<Model> | Partial<Model>[] | unknown, fields: string[] }> {
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
        return {
            data: finalObject,
            fields: existingFields
        };
    }

    private errorHandler(error: Error, reject: Function) {
        return reject(new Error(error.message));
    }

    public async insert<Model>(sheet: string, dataObject: Partial<Model>): Promise<Partial<Model>> {
        // Authenticate with the Google Spreadsheets API.
        await this.doc.useServiceAccountAuth(this.credentials);

        if (!this.info) {
            this.info = await this.doc.getInfo();

        }
        if (!this.doc.worksheets[sheet]) {
            try {

                const newSheet = await this.doc.addWorksheet({
                    title: `${sheet}`,
                });

                this.doc.worksheets[sheet] = new SpreadsheetWorksheet(this.doc, newSheet.data);

            } catch (error) {
                throw new Error('Cannot create sheet');
            }
        }


        const baseObject = await this.handleHeader<Model>(dataObject, sheet);


        if (baseObject.fields.indexOf('keyid') === -1) {
            baseObject.fields.push('keyid');
        }
        (baseObject.data as Key)['keyid'] = uuidv1();
        baseObject.data = this.prepareObject(baseObject.data);

        const insertedRow = await this.doc.worksheets[sheet].addRow(baseObject.data, baseObject.fields);
        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;

        return baseObject.data as Partial<Model>;
    }

    public async insertMany<Model>(sheet: string, dataObject: Partial<Model>[]): Promise<Partial<Model>[]> {
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

        const baseObject = await this.handleHeader(dataObject[0], sheet);
        baseObject.data = dataObject;
        if (baseObject.fields.indexOf('keyid') === -1) {
            baseObject.fields.push('keyid');
        }

        (baseObject.data as any[]).forEach((row: any) => {
            row.keyid = uuidv1();
            row = this.prepareObject(row);
        });

        const insertedRow = await this.doc.worksheets[sheet].addRows(baseObject.data, baseObject.fields);

        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].getRows({});
        this.loaded[sheet] = true;
        return baseObject.data as Partial<Model>[];
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

    public async deleteMany(sheet: string, rowKeys: string[]) {
        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();

        //this.errorHandler(err, reject);
        const data = await this.doc.worksheets[sheet].getRows({});
        this.sheets[sheet] = data;

        const indices: number[] = [];
        rowKeys.forEach((key) => {
            this.sheets[sheet].forEach((rowData: any, index: number) => {
                rowData.data['keyid'] === key ? indices.push(index + 1) : null;
            });
        });

        indices.sort((a, b) => (a > b) ? -1 : 1);

        this.loaded[sheet] = false;
        this.sheets[sheet] = await this.doc.worksheets[sheet].removeRows(this.doc.worksheets[sheet].id, indices);
        this.loaded[sheet] = true;
        return indices;
    }

    public async update<Model>(sheet: string, dataObject: Partial<Model | unknown>): Promise<Partial<Model>> {

        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();
        const baseObject = await this.handleHeader(dataObject, sheet);



        const row = this.sheets[sheet].filter((rowData: any) => {
            if (rowData.data) {
                return rowData.data['keyid'] === (dataObject as Key)['keyid'];
            }
            return false;
        });

        if (row.length > 0) {
            Object.assign(row[0].data, dataObject);
            baseObject.data = this.prepareObject(row[0].data);
            const result = await this.doc.worksheets[sheet].updateRow(row[0].index, baseObject.data, baseObject.fields);

            return result.data as Partial<Model>;
        } else {
            throw new Error('object not found');
        }
    }

    public async updateBy<Model>(sheet: string, dataObject: Partial<Model>, filter: (row: SpreadsheetRow<Model>) => {}): Promise<SheetDataResult<Model>> {

        await this.doc.useServiceAccountAuth(this.credentials);
        const info = await this.doc.getInfo();
        const baseObject = await this.handleHeader(dataObject, sheet);

        const row = this.sheets[sheet].filter(filter);
        if (row.length > 0) {
            baseObject.data = row[0].data;

            Object.assign(baseObject.data, dataObject);
            const updateResult = await this.doc.worksheets[sheet].updateRow<Model>(row[0].index, baseObject.data, baseObject.fields);
            return new SheetDataResult<Model>([updateResult.data]);
        } else {
            return new SheetDataResult<Model>([]);
        }
    }

    public async query<Model>(sheet: string, query?: (row: SpreadsheetRow<Model>) => {},
        start: number = 0, end: number = 9, sorts?: [SortRequest]): Promise<SheetDataResult<Model>> {

        try {
            const ready = new Promise(async (resolve, reject) => {
                if (!this.loaded[sheet] || !this.sheets[sheet]) {
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
                reverse = (sorts[0].direction !== 'asc') ? -1 : 1;
                sortField = sorts[0].colId;
            }

            await ready;

            let resultObject: { info: PagingInfo, data: Model[] } = {
                info: { total: 0 }, data: []
            }

            if (query) {
                if (this.sheets[sheet]) {

                    const filteredRows = this.sheets[sheet].filter(query);
                    resultObject.info.total = filteredRows.length;

                    resultObject.data = filteredRows.sort((a: SpreadsheetRow<Model>, b: SpreadsheetRow<Model>) => {
                        return ((a.data as any)[sortField] > (b.data as any)[sortField]) ? -1 * reverse : 1 * reverse
                    }).map((d: SpreadsheetRow<Model>) => d.data);
                }
            } else {
                resultObject.info.total = this.sheets[sheet].length;
                resultObject.data = this.sheets[sheet].sort((a: SpreadsheetRow<Model>, b: SpreadsheetRow<Model>) => {
                    return ((a.data as any)[sortField] > (b.data as any)[sortField]) ? 1 * reverse : -1 * reverse
                }).map((d: SpreadsheetRow<Model>) => d.data);
            }


            resultObject.data = resultObject.data.slice(start, end);
            return resultObject;

        } catch (error) {
            return ({ info: { total: 0 }, data: [] });
        }
    }
}