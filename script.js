/**
 * Modifies experience cards to display their date and time in a more
 * user-friendly way. Since events are added dynamically, a mutation observer
 * watches for all changes to the experience grid. If an element is added that
 * is an experience card, it's updated immediately.
 *
 * Changes that are made to the card:
 *   - A single date is displayed on the left side of the card
 *   - The existing timezone information is removed
 *   - The start and end times are displayed on the right side of the card
 *   - The times are displayed in the timezone of the browser
 *
 * @author Graham Still
 */

/**
 * Available time zone keywords mapped to their GMT offsets
 *
 * This is not a good way of handling this problem, since it only accounts for
 * daylight times; really, a library like moment.js should be used instead. For
 * the time being, though, I want to keep this plugin free of external
 * dependencies.
 */
const TIME_ZONES = {
  pacific: 'GMT-07:00',
  mountain: 'GMT-06:00',
  central: 'GMT-05:00',
  eastern: 'GMT-04:00',
  atlantic: 'GMT-03:00'
};

/**
 * Reformats the content of an experience card in a more readable way
 *
 * @param cardEl The element containing the card
 *
 * @return void
 */
function reformatCard(cardEl) {
  // Track down the elements we need to modify
  const dateEl = cardEl.getElementsByClassName('pvCard-date')[0];
  const locationEl = cardEl.getElementsByClassName('pvCard-location')[0];

  // Extract the information from the elements
  const [startDateString, endDateString] = dateEl.innerText.split('•').map(s => s.trim());
  const tzOffset = extractTimeZone(locationEl.innerText);

  // Parse the time into JavaScript Date objects
  const startDate = parseDate(startDateString, tzOffset);
  const endDate = parseDate(endDateString, tzOffset);

  // Build the new date element
  const newDateEl = createDateElement(startDate, endDate);

  // Update the card
  if (!newDateEl.innerText.includes('Invalid Date')) {
    dateEl.innerHTML = newDateEl.innerHTML;
    locationEl.parentNode.removeChild(locationEl);
  }
}

/**
 * Parses a date from a string
 *
 * The date is expected to come in the following format:
 *     MMM DD, YYYY (H)H:MM(A|P)M
 *
 * @param dateString The string to parse (see above for format)
 * @param tzKey      The keyword for the timezone. One of Eastern, Mountain,
 *                   Central, Eastern, or Atlantic
 *
 * @return A Date object corresponding to the date string and timezone
 */
function parseDate(dateString, tzOffset) {
  // For JavaScript to be able to parse the date, the period (AM/PM) needs to
  // be hacked off the end, and the timezone offset needs to be included.
  const dateStringWithTz = `${dateString.substring(0, dateString.length-2)} ${tzOffset}`;
  const date = new Date(dateStringWithTz);

  // Since we got rid of the period earlier, we'll need to account for it
  // ourselves manually
  if (needsTimeAdvance(dateString)) {
    date.setHours(date.getHours() + 12);
  }

  return date;
}

/**
 * Determines if a time, represented as a string, will need time added to it in
 * order to be converted to 24-hour time. Does not handle detection of time
 * adjustments from 12:00 AM, since no experiences will ever start then.
 *
 * The str is expected to come in the following format:
 *     MMM DD, YYYY (H)H:MM(A|P)M
 *
 * @param str A string representing the date
 * 
 * @return true if the time will need to be altered, and false otherwise
 */
function needsTimeAdvance(str) {
  const [ _, hour, period ] = str.match(/(\d{1,2}):\d{2}(AM|PM)$/)
  return period === 'PM' && parseInt(hour) !== 12;
}

/**
 * Builds a new element representing the date and time for a card
 *
 * @param startDate A Date object referring to the start time
 * @param endDate   A Date object referring to the end time
 *
 * @return An HTML element containing a reformatted date and time
 */
function createDateElement(startDate, endDate) {
  // Generate the content we're going to inject
  const dateString = formatDate(startDate);
  const startTimeString = formatTime(startDate);
  const endTimeString = formatTime(endDate, { timeZoneName: 'short' });

  // Build up the structure of the new element
  const dateContainer = document.createElement('span');
  const dateEl = document.createElement('span');
  const timeEl = document.createElement('span');
  dateContainer.appendChild(dateEl);
  dateContainer.appendChild(timeEl);

  // Inject the content into the structure we've built
  dateEl.innerText = dateString;
  timeEl.innerText = `${startTimeString} - ${endTimeString}`;

  return dateContainer;
}

/**
 * Converts a date to a string of the format MMM (D)D, YYYY
 *
 * @param date    A Date object to convert
 * @param options Additional toLocalDateString options to pass in
 *
 * @return A string representing the date
 */
function formatDate(date, options) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
}

/**
 * Converts a date to a string of the format (H)H:DD (A|P)M
 *
 * @param date    A Date object to convert
 * @param options Additional toLocalTimeString options to pass in
 *
 * @return A string representing the date as a time
 */
function formatTime(date, options) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    ...options
  });
}

/**
 * Extracts the timezone from a string
 *
 * The string must have a valid timezone keyword somewhere in it.
 *
 * @param locationString The string to extract from
 *
 * @return The timezone offset extrapolated from the string
 */
function extractTimeZone(locationString) {
  const haystack = locationString.toLowerCase();
  const [ _, offset ] = Object.entries(TIME_ZONES).find(([keyword, offset]) => haystack.includes(keyword));
  return offset;
}

/**
 * An element is a card if it has the pvCard-wrapper class.
 */
const isCard = el => el.classList.contains('pvCard-wrapper');

const observerConfig = { childList: true, subtree: true };
const observer = new MutationObserver(mutationsList => {
  const mutationRecord = mutationsList[0];
  const newNode = mutationRecord.addedNodes[0];

  if (isCard(newNode)) {
    reformatCard(newNode);
  }
});

observer.observe(document.querySelector('.experienceGrid-wrapper'), observerConfig);
