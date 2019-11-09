import { xmlSafeColumnName, forceArray, xmlSafeValue } from "./functions";
let RowSpreadsheet: any = null;


export class SpreadsheetRow {
    data: any;
    index: number;
    sheetId: number;
    /**
     *
     */
    constructor(spreadsheet: any, data: any, sheetId: number, rowIndex: number) {
        RowSpreadsheet = spreadsheet;
        this.sheetId = sheetId;
        this.data = data;
        this.index = rowIndex;

    }


    async save(headerRow: any) {
        await RowSpreadsheet.updateRow(this.data, headerRow, this.index);
    }
    async del() {

        await RowSpreadsheet.removeRow(this.sheetId, this.index);
    }
}
