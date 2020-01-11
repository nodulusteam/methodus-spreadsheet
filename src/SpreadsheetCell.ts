import { forceArray, xmlSafeValue } from "./functions";

export class SpreadsheetCell {
  links: any;
  _links: any;
  spreadsheet: any;
  
  batchId: string = '';
  ws_id: string = '';
  ss: string = '';
  id: string = '';
  _value: any;
  _needsSave: boolean = false;

  _formula: any;
  _numericValue: any;


  /**
   *
   */
  constructor(spreadsheet: any, ss_key: string, worksheet_id: string, data: any) {

    this.spreadsheet = spreadsheet;


    this.updateValuesFromResponseData(data);

    return this;
  }

  getId() {

  }

  getEdit() {

  }


  updateValuesFromResponseData(_data: any) {

  }

  async setValue(new_value: any) {
    this.value = new_value;
    return await this.save();
  };

  _clearValue() {
    this._formula = undefined;
    this._numericValue = undefined;
    this._value = '';
  }


  get value() {
    return this._value;
  }

  set value(val) {
    if (!val)
      this._clearValue();

    const numeric_val = parseFloat(val);
    if (!isNaN(numeric_val)) {
      this._numericValue = numeric_val;
      this._value = val.toString();
    } else {
      this._numericValue = undefined;
      this._value = val;
    }

    if (typeof val == 'string' && val.substr(0, 1) === '=') {
      // use the getter to clear the value
      this.formula = val;
    } else {
      this._formula = undefined;
    }
  }

  get formula() {
    return this._formula;
  }
  set formula(val) {
    if (!val)
      this._clearValue();

    if (val.substr(0, 1) !== '=') {
      throw new Error('Formulas must start with "="');
    }
    this._numericValue = undefined;
    this._value = '*SAVE TO GET NEW VALUE*';
    this._formula = val;
  }

  get numericValue() {
    return this._numericValue;
  }

  set numericValue(val) {
    if (val === undefined || val === null)
      this._clearValue();

    if (isNaN(parseFloat(val)) || !isFinite(val)) {
      throw new Error('Invalid numeric value assignment');
    }

    this._value = val.toString();
    this._numericValue = parseFloat(val);
    this._formula = undefined;
  }

  get valueForSave() {
    return xmlSafeValue(this._formula || this._value);
  }




  async save() {

  }

  async del() {
    await this.setValue('');
  }
}
