import React from 'react';
import Moment from 'moment';

var cx = React.addons.classSet;
var proptype = React.PropTypes;

// 1 class (TimeText), 1 function (display_duration)

/*
 * Renders times, usually for tables. We do something similar to gmail:
 *  If today: 2:35pm, 11:22am
 *  If another day: May 11, April 5
 *  If another year: Feb 13, 2008
 * Timestamps aren't relative, so no need for live updates...
 *  TODO: do we need times for builds that aren't today? Also consider days 
 *  of week?
 *  TODO: add 24 hour format support
 *  TODO: title with exact time? in UTC?
 */
export var TimeText = React.createClass({

  propTypes: {
    // The time to show. If not ISO 8601, will do the same as new Date()
    time: proptype.string.isRequired,
    // Manually specify time format. unix timestamp is example of when this is 
    // needed (format='X', see http://momentjs.com/docs/#/parsing/string-format/)
    format: proptype.string,

    // ...
    // transfers other properties to rendered <span />
  },

  getDefaultProps: function() {
    return {
      'format': ''
    }
  },

  render: function() {
    var { time, format, ...others } = this.props;
    var time_text = '';
    if (time) {
      if (format) {
        var time = moment(time, format);
      } else {
        var time = moment(time);
      }
      var now = moment();
      var is_same_year = time.year() === now.year();
      var is_same_day = time.format('MMMDDDYY') === now.format('MMMDDDYY');
      if (is_same_day) {
        time_text = time.format('h:mm a');
      } else if (is_same_year) {
        time_text = time.format('MMM D');
      } else {
        time_text = time.format('MMM D, YYYY');
      }
    }
    return <span {...others}>{time_text}</span>;
  }
});

/*
 * Converts 136 [in seconds] to a string like "2m16s"
 */
export var display_duration = function(total_seconds) {
  var seconds = 0, minutes = 0, hours = 0, days = 0;
  minutes = Math.floor(total_seconds / 60);
  seconds = Math.floor(total_seconds % 60);

  if (minutes > 60) {
    hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
  }

  if (hours > 24) {
    days = Math.floor(hours / 24);
    hours = hours % 24;
  }

  return (
    (days ? `${days}d` : "") +
    (hours ? `${hours}h` : "") +
    (minutes ? `${minutes}m` : "") +
    `${seconds}s` // show even if 0s TODO: if (minutes || seconds)
  );
}
