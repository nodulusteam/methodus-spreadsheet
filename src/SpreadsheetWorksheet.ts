import * as  _ from 'lodash';
import { SpreadsheetRow } from './SpreadsheetRow';

// Classes
export class SpreadsheetWorksheet {
    spreadsheet: any;
    data: any;
    url: string = '';
    id: string = '';
    title: string = '';
    rowCount: number = 0;
    _links: any;
    colCount: number = 0;

    constructor(spreadsheet: any, data: any) {
        this.spreadsheet = spreadsheet;
        this.data = data.properties || data;
        this.id = this.data.sheetId;
        this.title = this.data.title;
        this.rowCount = this.data.gridProperties.rowCount;
        this.colCount = this.data.gridProperties.columnCount;
    }

    async getHeaderRow(opts: any) {
        return await this.spreadsheet.getHeaderRow(this.title, opts);
    }

    async getRows(opts: any) {
        return await this.spreadsheet.getRows(this.title, opts);
    }


    async updateRow<Model>(index: number, data: any, headerRow: any[]): Promise<SpreadsheetRow<Model>> {
        return await this.spreadsheet.updateRow(this.data.sheetId, data, headerRow, index);
    }

    async addRow(data: any, headerRow: any[]) {
        return await this.spreadsheet.addRow(this.data.sheetId, data, headerRow);
    }
    async addRows(data: any, headerRow: any[]) {
        return await this.spreadsheet.addRows(this.data.sheetId, data, headerRow);
    }




    async del(sheetId: number, rangeIndex: number) {
        await this.spreadsheet.removeRow(sheetId, rangeIndex);
    }

    async removeRows(sheetId: string, indices: number[]) {
        return await this.spreadsheet.removeRows(sheetId, indices);
    }


    // async setHeaderRow(values: any) {
    //     if (!values) return;
    //     if (values.length > this.colCount) {
    //         throw new Error('Sheet is not large enough to fit ' + values.length + ' columns. Resize the sheet first.');
    //     }

    //     const headerPayload = {
    //         "range": `${this.id}!A1:Z1`,
    //         "majorDimension": "ROWS",
    //         "values": [
    //             values,

    //         ],
    //     }
    //     const response: any = await this.spreadsheet.makeFeedRequest([this.spreadsheet.id, 'values', `${this.id}!A1:Z1`], 'PUT', headerPayload);


    // }
}
