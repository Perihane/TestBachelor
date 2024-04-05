const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const app = express();
const path = require('path');
const { google } = require('googleapis');
const calendarId = "70622acc72477def0756b799db98b4b6d8b9578e5b3e398746636dc2550ae0b7@group.calendar.google.com"
const serviceAccount = require('./navigation-euwl-4572887d6858.json');
const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/calendar'], 
  });
  const calendar = google.calendar({ version: 'v3', auth });
  
 process.env.DEBUG = 'dialogflow:*'; 
//  app.get('/', (req, res) => {
//   res.send('Appointment Scheduler!'); // Replace with your desired response
// });
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

  const timeZone = 'Africa/Cairo';
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });

  function welcome(agent){
    agent.add("Hello! I am ScheduleBuddy, Dr. Ayman's virtual assistant, if you wish to schedule an appointment, please provide me with your Name, GUC ID and GUC email :) \n If you already have an appointment, and would like to modify or cancel it, simply let me know. If you'd like to know when your appointment is scheduled, just ask!")
    
  }

  function setInfo(agent) {
    console.log("info")
    const name = agent.parameters.Name.name;
   const id = agent.parameters.ID;
  const  mail = agent.parameters.email;
 agent.add(`Hello, ${name}! When do you want to see Dr. Ayman? Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please provide a date, time (include am/pm), and duration (15 or 30 minutes).`);

}
  
  function makeAppointment (agent) {
   console.log("appointment")
   const name = agent.parameters.Name.name;
   const id = agent.parameters.ID;
   const  mail = agent.parameters.email;
   const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0]));  
   const durationInMinutes = parseInt(agent.parameters.Duration);
   const startHour = dateTimeStart.getHours();
   const startMinute = dateTimeStart.getMinutes();
   let endHour = startHour;
   let endMinute = startMinute + durationInMinutes;
  
if (endMinute >= 60) {
   endHour += Math.floor(endMinute / 60);
   endMinute %= 60;
}
const dateTimeEnd = new Date(dateTimeStart);
dateTimeEnd.setHours(endHour, endMinute);
    const appointmentTimeString = dateTimeStart.toLocaleString(
      'en-US',
      { month: 'long', day: 'numeric', hour: 'numeric', minute:'numeric', timeZone: timeZone }
    );
        if (dateTimeStart.getDay() !== 0) {
       agent.add("Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please enter another date and time");
       return;
   }

   if ( startHour < 10 || dateTimeEnd.getHours() > 19) {
    console.log(startHour);
       agent.add("Appointments can only be scheduled between 10 am and 7 pm on Sundays. Please enter another time");
       return;
   }
  //  createCalendarEvent(dateTimeStart, dateTimeEnd, name, id, mail)
  //  .then(() => {
  //      agent.add(`Ok, your appointment is on ${appointmentTimeString} You have ${durationInMinutes} minutes!`);
  //  })
  //  .catch(() => {
  //      agent.add(`I'm sorry, the requested time conflicts with another appointment. Please enter another time`);
  //  });
//    calendar.events.list({
//     auth: auth,
//     calendarId: calendarId,
//     timeMin: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate()).toISOString(),
//     timeMax: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate() + 1).toISOString(),
//     singleEvents: true,
//     q: id 
// }, (err, calendarResponse) => {
//     if (err) {
//         console.error('Error retrieving events:', err);
//      //  agent.add("Sorry, there was an error checking for existing appointments. Please try again later.");
//         return;
//     }
//     const existingAppointments = calendarResponse.data.items;
//     if (existingAppointments.length > 0) {
//       console.log('EVENTSSSSS')
//         agent.add("You already have an appointment scheduled for this day. You cannot make another appointment.");
//     } else {
       
//         // createCalendarEvent(dateTimeStart, dateTimeEnd, name, id, mail)
//         //     .then(() => {
//         //         agent.add(`Ok, your appointment is on ${appointmentTimeString} You have ${durationInMinutes} minutes!`);
//         //     })
//         //     .catch(() => {
//         //         agent.add(`I'm sorry, the requested time conflicts with another appointment. Please enter another time`);
//         //     });
//     }
// });
    return createCalendarEvent(dateTimeStart, dateTimeEnd,name,id,mail).then(() => {
      agent.add(`Ok, your appointment is on ${appointmentTimeString} You have ${durationInMinutes} minutes!`);
    }).catch(() => {
      agent.add(`I'm sorry, Requested time: ${dateTimeStart.toLocaleString('en-US', {hour: 'numeric', minute:'numeric', timeZone: timeZone }) } conflicts with another appointment. Please enter another time`)});
  }

function createCalendarEvent (dateTimeStart, dateTimeEnd, name, id,mail) {
 // console.log (name, id,mail)
  return new Promise((resolve, reject) => {
    calendar.events.list({
      auth: auth, // List events for time period
      calendarId: calendarId,
      timeMin: dateTimeStart.toISOString(),
      timeMax: dateTimeEnd.toISOString()
    }, (err, calendarResponse) => {
      // Check if there is a event already on the Calendar
      if (err || calendarResponse.data.items.length > 0) {
        reject(err || new Error('Requested time conflicts with another appointment'));
      } else {
        // Create event for the requested time period
        calendar.events.insert({ auth: auth,
          calendarId: calendarId,
          resource: {summary: name +`'s Appointment`, description: 'ID: '+ id+ ', mail: '+mail,
            start: {dateTime: dateTimeStart},
            end: {dateTime: dateTimeEnd}}
        }, (err, event) => {
          err ? reject(err) : resolve(event);
        }
        );
      }
    });
  });
  
}
function showAvailableSlots(agent) {
   const startDate = new Date();
   const endDate = new Date();
   endDate.setDate(startDate.getDate() + 10);

   return getCalendarEvents(startDate, endDate)
       .then(events => {
           if (events.length === 0) {
               agent.add("There are no appointments scheduled within the next 10 days.");
           } else {
               const formattedEvents = events.map(event => {
                   const startDateTime = new Date(event.start.dateTime);
                   const endDateTime = new Date(event.end.dateTime);
                   const startTimeString = startDateTime.toLocaleString(
      'en-US',
      { month: 'long', day: 'numeric', hour: 'numeric',minute: 'numeric', timeZone: timeZone }
    );
                 const endTimeString = endDateTime.toLocaleString(
      'en-US',
      { hour: 'numeric', minute: 'numeric', timeZone: timeZone }
    );
                   return `${ startTimeString} - ${endTimeString}`+`\n`;
               });
               agent.add(`Booked slots within the next 10 days:\n${formattedEvents.join('//')}`);
           }
       })
       .catch(error => {
           console.error("Error fetching calendar events:", error);
           agent.add("Sorry, there was an error fetching the calendar events. Please try again later.");
       });
}

function getMyAppointments(agent) {
    const id = agent.parameters.gucid;
    const p=new Promise((resolve, reject) => {
      calendar.events.list({
        auth: auth,
        calendarId: calendarId,
        timeMin: (new Date()).toISOString(), // Start from current time
        singleEvents: true,
        orderBy: 'startTime',
        q:  id 
      }, (err, calendarResponse) => {
        if (err) {
          console.error('Error retrieving events:', err);
          reject(err);
        } else {
          const events = calendarResponse.data.items;
          resolve(events);
        }
      });
    });
    return p.then(events => {
        if (events.length === 0) {
            agent.add("You ("+id+") don't have any scheduled appointments with Dr. Ayman. If you wish to book an appointment, please provide your Name, GUC ID, and GUC email");
        } else {
            const formattedEvents = events.map(event => {
                const startDateTime = new Date(event.start.dateTime);
                const endDateTime = new Date(event.end.dateTime);
                const startTimeString = startDateTime.toLocaleString(
   'en-US',
   { month: 'long', day: 'numeric', hour: 'numeric',minute: 'numeric', timeZone: timeZone }
 );
              const endTimeString = endDateTime.toLocaleString(
   'en-US',
   { hour: 'numeric', minute: 'numeric', timeZone: timeZone }
 );
                return `${ startTimeString} - ${endTimeString}`+`\n`;
            });
            agent.add(`You (${id}) have an appointment on \n${formattedEvents.join('and on ')}`);
        }
    })
    .catch(error => {
        console.error("Error fetching calendar events:", error);
        agent.add("Sorry, there was an error fetching the calendar events. Please try again later.");
    });
  }

  function cancelAppointment(agent) {
    const id = agent.parameters.gucid;
    return new Promise((resolve, reject) => {
        calendar.events.list({
            auth: auth,
            calendarId: calendarId,
            timeMin: (new Date()).toISOString(), // Start from current time
            singleEvents: true,
            orderBy: 'startTime',
            q:  id 
        }, (err, response) => {
            if (err) {
                agent.add('Error retrieving event: ' + err);
                reject(err);
            } else {
                const events = response.data.items;
                if (events.length === 0) {
                    agent.add(`You have no appointments to cancel`);
                    resolve(); // Resolve here since there are no appointments to cancel
                } else {
                    const firstEvent = events[0];
                    calendar.events.delete({
                        auth: auth,
                        calendarId: calendarId,
                        eventId: firstEvent.id
                    }, (error, response) => {
                        if (error) {
                            agent.add('Error deleting event: ' + error);
                            reject(error);
                        } else {
                            const deletedEventDate = new Date(firstEvent.start.dateTime).toLocaleDateString();
                            agent.add('Appointment Cancelled Successfully for: ' + id+' on ' +deletedEventDate);
                            resolve(); // Resolve here after sending the response to the user
                        }
                    });
                }
            }
        });
    });
}

  
function getCalendarEvents(startDate, endDate) {
   return new Promise((resolve, reject) => {
       calendar.events.list({
           auth: auth,
           calendarId: calendarId,
           timeMin: startDate.toISOString(),
           timeMax: endDate.toISOString(),
           singleEvents: true,
           orderBy: 'startTime',
       }, (err, response) => {
           if (err) {
               console.error("Error listing calendar events:", err);
               reject(err);
           } else {
               resolve(response.data.items);
           }
       });
   });
}



  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Personal Info', setInfo);
  intentMap.set('Schedule Appointment', makeAppointment);
  intentMap.set('Wrong day', makeAppointment);
  intentMap.set('Wrong time', makeAppointment);
  intentMap.set('Show Available Slots', showAvailableSlots);
  intentMap.set('Get Appointment', getMyAppointments);
  intentMap.set('Cancel Appointment', cancelAppointment );
  
  agent.handleRequest(intentMap);

  
});
// app.listen(80, () => {
//   console.log('Server is running on port 80');
// });
var listener = app.listen(process.env.PORT,process.env.IP,function(){
 // console.log("server has started");
  console.log('listening on port '+ listener.address().port);
});


