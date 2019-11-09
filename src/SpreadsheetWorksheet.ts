import { forceArray } from "./functions";
import * as  _ from 'lodash';

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
        this.data = data.properties;


        // this.url = data.id;
        this.id = this.data.title;
        this.title = this.data.title;
        this.rowCount = this.data.gridProperties.rowCount;
        this.colCount = this.data.gridProperties.columnCount;
        // this['_links'] = [];
        // links = forceArray(data.link);
        // links.forEach((link: any) => {
        //     this['_links'][link['$']['rel']] = link['$']['href'];
        // });
        // this['_links']['cells'] = self['_links']['http://schemas.google.com/spreadsheets/2006#cellsfeed'];
        // this['_links']['bulkcells'] = self['_links']['cells'] + '/batch';


    }










    async getHeaderRow(opts: any) {
        return await this.spreadsheet.getHeaderRow(this.id, opts);
    }

    async getRows(opts: any) {
        return await this.spreadsheet.getRows(this.id, opts);
    }
    async getCells(opts?: any) {
        return await this.spreadsheet.getCells(this.id, opts);
    }

    async updateRow(index: number, data: any, headerRow: any[]) {
        return await this.spreadsheet.updateRow(this.data.sheetId, data, headerRow, index);
    }

    async addRow(data: any, headerRow: any[]) {
        return await this.spreadsheet.addRow(this.data.sheetId, data, headerRow);
    }





    async del(sheetId: number, rangeIndex: number) {

        await this.spreadsheet.removeRow(sheetId, rangeIndex);
    }

    async setHeaderRow(values: any) {
        if (!values) return;
        if (values.length > this.colCount) {
            throw new Error('Sheet is not large enough to fit ' + values.length + ' columns. Resize the sheet first.');
        }

        const headerPayload = {
            "range": `${this.id}!A1:Z1`,
            "majorDimension": "ROWS",
            "values": [
                values,

            ],
        }
        const response: any = await this.spreadsheet.makeFeedRequest([this.spreadsheet.id, 'values', `${this.id}!A1:Z1`], 'PUT', headerPayload);

 
    }
}
