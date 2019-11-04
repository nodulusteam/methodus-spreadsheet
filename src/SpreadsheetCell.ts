import { forceArray, xmlSafeValue } from "./functions";

export class SpreadsheetCell {
  links: any;
  _links: any;
  spreadsheet: any;
  row: number;
  col: number;
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
    this.row = parseInt(data['gs:cell']['$']['row']);
    this.col = parseInt(data['gs:cell']['$']['col']);
    this.batchId = 'R' + this.row + 'C' + this.col;
    if (data['id'] == "https://spreadsheets.google.com/feeds/cells/" + ss_key + "/" + worksheet_id + '/' + this.batchId) {
      this.ws_id = worksheet_id;
      this.ss = ss_key;
    } else {
      this.id = data['id'];
    }

    this['_links'] = [];
    this.links = forceArray(data.link);
    for (var i = 0; i < this.links.length; i++) {
      var link = this.links[i];
      if (link['$']['rel'] == "self" && link['$']['href'] == this.getSelf()) continue;
      if (link['$']['rel'] == "edit" && link['$']['href'] == this.getEdit()) continue;
      this['_links'][link['$']['rel']] = link['$']['href'];
    }
    if (this['_links'].length == 0) delete this['_links'];

    this.updateValuesFromResponseData(data);

    return this;
  }

  getId() {
    if (!!this.id) {
      return this.id;
    } else {
      return "https://spreadsheets.google.com/feeds/cells/" + this.ss + "/" + this.ws_id + '/' + this.batchId;
    }
  }

  getEdit() {
    if (!!this['_links'] && !!this['_links']['edit']) {
      return this['_links']['edit'];
    } else {
      return this.getId().replace(this.batchId, "private/full/" + this.batchId);
    }
  }

  getSelf() {
    if (!!this['_links'] && !!this['_links']['edit']) {
      return this['_links']['edit'];
    } else {
      return this.getId().replace(this.batchId, "private/full/" + this.batchId);
    }
  }

  updateValuesFromResponseData(_data: any) {
    // formula value
    var input_val = _data['gs:cell']['$']['inputValue'];
    // inputValue can be undefined so substr throws an error
    // still unsure how this situation happens
    if (input_val && input_val.substr(0, 1) === '=') {
      this._formula = input_val;
    } else {
      this._formula = undefined;
    }

    // numeric values
    if (_data['gs:cell']['$']['numericValue'] !== undefined) {
      this._numericValue = parseFloat(_data['gs:cell']['$']['numericValue']);
    } else {
      this._numericValue = undefined;
    }

    // the main "value" - its always a string
    this._value = _data['gs:cell']['_'] || '';
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

    var numeric_val = parseFloat(val);
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
    this._needsSave = false;
    var data_xml =
      '<entry><id>' + this.getId() + '</id>' +
      '<link rel="edit" type="application/atom+xml" href="' + this.getId() + '"/>' +
      '<gs:cell row="' + this.row + '" col="' + this.col + '" inputValue="' + this.valueForSave + '"/></entry>'

    data_xml = data_xml.replace('<entry>', "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:gs='http://schemas.google.com/spreadsheets/2006'>");
    const response = await this.spreadsheet.makeFeedRequest(this.getEdit(), 'PUT', data_xml);
    this.updateValuesFromResponseData(response);
    return response;
  }

  async del() {
    await this.setValue('');
  }
}
