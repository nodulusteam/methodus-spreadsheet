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

    private async _setInfo(opts: any) {
        var xml = ''
            + '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006">'
            + '<title>' + (opts.title || this.title) + '</title>'
            + '<gs:rowCount>' + (opts.rowCount || this.rowCount) + '</gs:rowCount>'
            + '<gs:colCount>' + (opts.colCount || this.colCount) + '</gs:colCount>'
            + '</entry>';
        const response = await this.spreadsheet.makeFeedRequest(this['_links']['edit'], 'PUT', xml);
        this.title = response.title;
        this.rowCount = parseInt(response['gs:rowCount']);
        this.colCount = parseInt(response['gs:colCount']);
    }

    async resize(opts: any) {
        await this._setInfo(opts);
    }
    async  setTitle(title: string) {
        await this._setInfo({ title: title });
    }


    // just a convenience method to clear the whole sheet
    // resizes to 1 cell, clears the cell, and puts it back
    async clear(cb: any) {
        var cols = this.colCount;
        var rows = this.colCount;
        this.resize({ rowCount: 1, colCount: 1 });

        const cells = await this.getCells();

        cells[0].setValue(null, (err: Error) => {
            if (err) return cb(err);
            this.resize({ rowCount: rows, colCount: cols });
        });
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

    async updateRow( index: number ,data: any, headerRow: any[]) {
        return await this.spreadsheet.updateRow(this.data.sheetId, data, headerRow, index);
    }

    async addRow(data: any, headerRow: any[]) {
        return await this.spreadsheet.addRow(this.data.sheetId, data, headerRow);
    }

    async bulkUpdateCells(cells: any) {

        var entries = cells.map((cell: any, i: number) => {
            cell._needsSave = false;
            return "<entry>\n        <batch:id>" + cell.batchId + "</batch:id>\n        <batch:operation type=\"update\"/>\n        <id>" + this['_links']['cells'] + '/' + cell.batchId + "</id>\n        <link rel=\"edit\" type=\"application/atom+xml\"\n          href=\"" + cell.getEdit() + "\"/>\n        <gs:cell row=\"" + cell.row + "\" col=\"" + cell.col + "\" inputValue=\"" + cell.valueForSave + "\"/>\n      </entry>";
        });
        var data_xml = "<feed xmlns=\"http://www.w3.org/2005/Atom\"\n      xmlns:batch=\"http://schemas.google.com/gdata/batch\"\n      xmlns:gs=\"http://schemas.google.com/spreadsheets/2006\">\n      <id>" + this['_links']['cells'] + "</id>\n      " + entries.join("\n") + "\n    </feed>";

        const response = await this.spreadsheet.makeFeedRequest(this['_links']['bulkcells'], 'POST', data_xml);
        const data = response.result;

        // update all the cells
        var cells_by_batch_id = _.keyBy(cells, 'batchId');
        if (data.entry && data.entry.length) data.entry.forEach((cell_data: any) => {
            cells_by_batch_id[cell_data['batch:id']].updateValuesFromResponseData(cell_data);
        });
    }



    async del() {
        await this.spreadsheet.makeFeedRequest(this['_links']['edit'], 'DELETE', null);
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

        // const cells = await this.getCells({
        //     'min-row': 1,
        //     'max-row': 1,
        //     'min-col': 1,
        //     'max-col': this.colCount,
        //     'return-empty': true
        // });

        // _.each(cells, (cell: any) => {
        //     cell.value = values[cell.col - 1] ? values[cell.col - 1] : '';
        // });
        // await this.bulkUpdateCells(cells);
    }
}
