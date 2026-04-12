'use client';

import { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const FullCalendarNoSSR = forwardRef(function FullCalendarNoSSR(props, ref) {
  return <FullCalendar ref={ref} plugins={[dayGridPlugin, interactionPlugin]} {...props} />;
});

export default FullCalendarNoSSR;
