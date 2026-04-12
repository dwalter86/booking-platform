'use client';

import { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const FullCalendarNoSSR = forwardRef(function FullCalendarNoSSR(props, ref) {
  return <FullCalendar ref={ref} plugins={[dayGridPlugin]} {...props} />;
});

export default FullCalendarNoSSR;
