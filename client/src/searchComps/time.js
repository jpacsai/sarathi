import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import MomentUtils from '@date-io/moment';
import { MuiPickersUtilsProvider, TimePicker} from 'material-ui-pickers';

// const styles = {
//   grid: {
//     width: '60%',
//   },
// };

class MaterialUIPickers extends React.Component {
  state = {
    // The first commit of Material-UI
    selectedDate:  Date('2014-08-18T21:11:54'),
  };

  handleDateChange = date => {
    this.setState({ selectedDate: new Date(date) });
    this.props.onPassData(new Date(date));
  };

  render() {
    const { selectedDate } = this.state;

    return (
      <div style={{display: 'flex', justifyContent: 'center', margin: 10}}>
      <MuiPickersUtilsProvider utils={MomentUtils}>
          <TimePicker
            label="Time of Departure"
            value={selectedDate}
            onChange={this.handleDateChange}
          />
      </MuiPickersUtilsProvider>
      </div>
    );
  }
}

MaterialUIPickers.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default MaterialUIPickers;
