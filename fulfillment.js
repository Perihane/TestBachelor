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
//   const { DateTime, Settings } = require('luxon');
//   Settings.defaultZone = 'Africa/Cairo';
 process.env.DEBUG = 'dialogflow:*'; 
//  app.get('/', (req, res) => {
//   res.send('Appointment Scheduler!'); // Replace with your desired response
// });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
 
  
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  const timeZone = 'Africa/Cairo';
  let modifiedname;
  let modifiedmail;
  function welcome(agent){
    agent.add("Hello! I am ScheduleBuddy, Dr. Ayman's virtual assistant, if you wish to schedule an appointment, please provide me with your Name, GUC ID and GUC email :) \n If you already have an appointment, and would like to modify or cancel it, simply let me know. If you'd like to know when is your appointment, just ask! If you want to see all Dr Ayman's scheduled appointments for the next 20 days, ask me when can I book a slot? :)")
    
  }
//   function parseDateTime(date, time) {
//     const [year, month, day] = date.split('-').map(Number);
//     const [hours, minutes] = time.split(':').map(Number);
//     return DateTime.fromObject({
//         year,
//         month,
//         day,
//         hour: hours,
//         minute: minutes
//     });
// }
  function setInfo(agent) {
    console.log("info")
    const name = agent.parameters.Name;
   const id = agent.parameters.ID;
  const  mail = agent.parameters.email;
 agent.add(`Hello, ${name}! When do you want to see Dr. Ayman? Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please provide a date, time (include am/pm), and duration (15 or 30 minutes).`);

}
  
function makeAppointment(agent) {
    console.log("appointment");
    const name = agent.parameters.Name;
    const id = agent.parameters.ID;
    const mail = agent.parameters.email;
    const hours = 1;
   //const dateTimeStart = toTimeZone(new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0])), timeZone);
   
    const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0]));
   // dateTimeStart.setHours(dateTimeStart.getHours+1);
    dateTimeStart.setTime(dateTimeStart.getTime() - hours * 60 * 60 * 1000);
    console.log(dateTimeStart);
    const timeZone = 'Africa/Cairo'; // Set your desired time zone
    //const agentParameters = agent.parameters;
    //const dateTimeStart = parseDateTime(agentParameters.date.split('T')[0], agentParameters.time.split('T')[1].split('-')[0]);
    const durationInMinutes = parseInt(agent.parameters.Duration);
    const startHour = dateTimeStart.getHours();
    const startMinute = dateTimeStart.getMinutes();
    // const startHour = dateTimeStart.hour;
    // const startMinute = dateTimeStart.minute;
    let endHour = startHour;
    let endMinute = startMinute + durationInMinutes;
    console.log('dur',durationInMinutes,'enhour',endHour,'endmin',endMinute,'startmin',startMinute);
    if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute %= 60;
    }
    const dateTimeEnd = new Date(dateTimeStart);
    dateTimeEnd.setHours(endHour, endMinute);
    const appointmentTimeString = dateTimeStart.toLocaleString(
        'en-US',
        { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
    );
    if (dateTimeStart.getDay() !== 0) {
        agent.add("Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please enter another date and time");
        return;
    }
    if (startHour + 3 < 10 || dateTimeEnd.getHours() + 3 > 19 || (dateTimeEnd.getHours() + 3 === 19 && dateTimeEnd.getMinutes() != 0)) {
        agent.add("Appointments can only be scheduled between 10 am and 7 pm on Sundays. Please enter another time");
        return;
    }
    const p=new Promise((resolve, reject) => {
        calendar.events.list({
          auth: auth,
          calendarId: calendarId,
        //   timeMin: new Date(dateTimeStart.year, dateTimeStart.month, dateTimeStart).toISOString(),
        //   timeMax: new Date(dateTimeStart.year, dateTimeStart.month, dateTimeStart + 1).toISOString(),
          timeMin: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate()).toISOString(),
          timeMax: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate() + 1).toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          q: id
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
            return createCalendarEvent(dateTimeStart, dateTimeEnd, name, id, mail)
            .then(() => {
                agent.add(`Ok, your appointment is on ${appointmentTimeString} You have ${durationInMinutes} minutes!`);
            })
            .catch(() => {
                agent.add(`I'm sorry, the requested time conflicts with another appointment. Please enter another time`);
            });
            }
            else {
                agent.add("You already have an appointment scheduled for this day. Each student can only have one appointment per week. You can either choose another day or modify your existing appointment");
            }
        });
  
    }
    function modifyfollowupAppointment(agent) {
      const id = agent.parameters.ID;
     //const dateTimeStart = toTimeZone(new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0])), timeZone);
      const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0]));
      dateTimeStart.setTime(dateTimeStart.getTime() - 1 * 60 * 60 * 1000);
      //dateTimeStart.setHours(dateTimeStart.getHours+1);
      console.log(dateTimeStart)
      const timeZone = 'Africa/Cairo'; // Set your desired time zone
      //const agentParameters = agent.parameters;
      //const dateTimeStart = parseDateTime(agentParameters.date.split('T')[0], agentParameters.time.split('T')[1].split('-')[0]);
      const durationInMinutes = parseInt(agent.parameters.Duration);
      const startHour = dateTimeStart.getHours();
      const startMinute = dateTimeStart.getMinutes();
      // const startHour = dateTimeStart.hour;
      // const startMinute = dateTimeStart.minute;
      let endHour = startHour;
      let endMinute = startMinute + durationInMinutes;
      console.log('dur',durationInMinutes,'enhour',endHour,'endmin',endMinute,'startmin',startMinute);
      if (endMinute >= 60) {
          endHour += Math.floor(endMinute / 60);
          endMinute %= 60;
      }
      const dateTimeEnd = new Date(dateTimeStart);
      dateTimeEnd.setHours(endHour, endMinute);
      const appointmentTimeString = dateTimeStart.toLocaleString(
          'en-US',
          { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
      );
      console.log(dateTimeStart.getDay());
      if (dateTimeStart.getDay() !== 0) {
          agent.add("Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please enter another date and time");
          return;
      }
      if (startHour + 3 < 10 || dateTimeEnd.getHours() + 3 > 19 || (dateTimeEnd.getHours() + 3 === 19 && dateTimeEnd.getMinutes() != 0)) {
          agent.add("Appointments can only be scheduled between 10 am and 7 pm on Sundays. Please enter another time");
          return;
      }
      const p=new Promise((resolve, reject) => {
          calendar.events.list({
            auth: auth,
            calendarId: calendarId,
          //   timeMin: new Date(dateTimeStart.year, dateTimeStart.month, dateTimeStart).toISOString(),
          //   timeMax: new Date(dateTimeStart.year, dateTimeStart.month, dateTimeStart + 1).toISOString(),
            timeMin: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate()).toISOString(),
            timeMax: new Date(dateTimeStart.getFullYear(), dateTimeStart.getMonth(), dateTimeStart.getDate() + 1).toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            q: id
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
              return createCalendarEvent(dateTimeStart, dateTimeEnd, modifiedname, id, modifiedmail)
              .then(() => {
                  agent.add(`Ok, your appointment is now on ${appointmentTimeString} You have ${durationInMinutes} minutes!`);
              })
              .catch(() => {
                  agent.add(`I'm sorry, the requested time conflicts with another appointment. Please enter another time`);
              });
              }
              else {
                  agent.add("You already have an appointment scheduled for this day. Each student can only have one appointment per week. You can either choose another day or modify your existing appointment");
              }
          });
    
      }
function createCalendarEvent (dateTimeStart, dateTimeEnd, name, id,mail) {
 console.log (name, id,mail)
 console.log (dateTimeStart, dateTimeEnd)
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

// function toTimeZone(date, timeZone) {
//     const options = { timeZone };
//     return new Date(date.toLocaleString('en-US', options));
// }

// 
// function showAvailableSlots(agent) {
//   const startDate = new Date();
//   const endDate = new Date();
//   endDate.setDate(startDate.getDate() + 20);

//   return getCalendarEvents(startDate, endDate)
//       .then(events => {
//           if (events.length === 0) {
//               agent.add("There are no appointments scheduled within the next 20 days.");
//           } else {
//               // Group events by date
//               const eventsByDate = {};
//               events.forEach(event => {
//                   const startDateTime = new Date(event.start.dateTime);
//                   const dateString = startDateTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
//                   if (!eventsByDate[dateString]) {
//                       eventsByDate[dateString] = [];
//                   }
//                   const startTimeString = startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
//                   const endDateTime = new Date(event.end.dateTime);
//                   const endTimeString = endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
//                   eventsByDate[dateString].push(`${startTimeString} - ${endTimeString}`);
//               });

//               // Format events
//               let formattedEvents = '';
//               Object.entries(eventsByDate).forEach(([date, slots]) => {
//                   const slotsFormatted = slots.join(' // ');
//                   formattedEvents += `${date}: ${slotsFormatted} 

//                   `
//               });

//               agent.add(`Booked slots within the next 20 days:
//               ${formattedEvents} 

//               `);
//           }
//       })
//       .catch(error => {
//           console.error("Error fetching calendar events:", error);
//           agent.add("Sorry, there was an error fetching the calendar events. Please try again later.");
//       });
// }

function showAvailableSlots(agent) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 20);

  return getCalendarEvents(startDate, endDate)
      .then(events => {
          if (events.length === 0) {
              agent.add("There are no appointments scheduled within the next 20 days.");
          } else {
              const groupedEvents = {};
              events.forEach(event => {
                  const startDateTime = new Date(event.start.dateTime);
                  const dateKey = startDateTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                  if (!groupedEvents[dateKey]) {
                      groupedEvents[dateKey] = [];
                  }
                  const startTimeString = startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', timeZone: timeZone });
                  const endDateTime = new Date(event.end.dateTime);
                  const endTimeString = endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', timeZone: timeZone });
                  groupedEvents[dateKey].push(`${startTimeString} - ${endTimeString}`);
              });

              const formattedEvents = Object.keys(groupedEvents).map(dateKey => {
                  const slots = groupedEvents[dateKey].join(' // ');
                  return `${dateKey}:\n${slots}`;
              });

              agent.add(`Booked slots within the next 20 days:\n${formattedEvents.join('\n\n')}`);
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

function deleteAndadd(agent){
  const id = agent.parameters.ID;

  return new Promise((resolve, reject) => {
      calendar.events.list({
          auth: auth,
          calendarId: calendarId,
          timeMin: (new Date()).toISOString(), // Start from current time
          singleEvents: true,
          orderBy: 'startTime',
          q: id
      }, (err, response) => {
          if (err) {
              console.log('Error retrieving event: ' + err);
              reject(err);
          } else {
              const events = response.data.items;
              if (events.length === 0) {
                  agent.add(`You have no appointments to modify`);
                  resolve(); // Resolve here since there are no appointments to modify
              } else {
                  const firstEvent = events[0];
                   modifiedname = firstEvent.summary.split("'s Appointment")[0];
                   modifiedmail = firstEvent.description.split(', mail: ')[1];
                  const deletedEventDate = new Date(firstEvent.start.dateTime).toLocaleString(
                      'en-US',
                      { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
                  );
                  calendar.events.delete({
                      auth: auth,
                      calendarId: calendarId,
                      eventId: firstEvent.id
                  }, (error, response) => {
                      if (error) {
                          agent.add('Error modifying event: ' + error);
                          reject(error);
                      } else {
                          const dateTimeStart = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('-')[0]));
                          dateTimeStart.setTime(dateTimeStart.getTime() - 1 * 60 * 60 * 1000);
                          const durationInMinutes = parseInt(agent.parameters.Duration);
                          const startHour = dateTimeStart.getHours();
                          const startMinute = dateTimeStart.getMinutes();
                          
                          let endHour = startHour;
                          //console.log("DURATION: " + durationInMinutes)
                          let endMinute = startMinute + durationInMinutes;

                          if (endMinute >= 60) {
                              endHour += Math.floor(endMinute / 60);
                              endMinute %= 60;
                          }

                          const dateTimeEnd = new Date(dateTimeStart);
                          dateTimeEnd.setHours(endHour, endMinute);
                          const appointmentTimeString = dateTimeStart.toLocaleString(
                              'en-US',
                              { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
                          );

                          if (dateTimeStart.getDay() !== 0) {
                              agent.add("Appointments can only be scheduled on Sundays, between 10 am and 7 pm. Please enter another date and time");
                              resolve();
                              return;
                          }

                          if (startHour + 3 < 10 || dateTimeEnd.getHours() + 3 > 19 || (dateTimeEnd.getHours() + 3 === 19 && dateTimeEnd.getMinutes() != 0)) {
                              agent.add("Appointments can only be scheduled between 10 am and 7 pm on Sundays. Please enter another time");
                              resolve();
                              return;
                          }
                          console.log(deletedEventDate +"    " +appointmentTimeString)
                          createCalendarEvent(dateTimeStart, dateTimeEnd, modifiedname, id, modifiedmail)
                              .then(() => {
                                  agent.add(`Ok, your appointment is modified, instead of ${deletedEventDate}, it is now on ${appointmentTimeString}. You have ${durationInMinutes} minutes!`);
                                  resolve();
                              })
                              .catch(() => {
                                  agent.add(`I'm sorry, the requested time conflicts with another appointment. Please enter another time`);
                                  resolve();
                              });
                      }
                  });
              }
          }
      });
  });
}
function modifyAppointment(agent) {
  const id = agent.parameters.ID;
  const p = new Promise((resolve, reject) => {
      calendar.events.list({
          auth: auth,
          calendarId: calendarId,
          timeMin: (new Date()).toISOString(), // Start from current time
          singleEvents: true,
          orderBy: 'startTime',
          q: id
      }, (err, response) => {
          if (err) {
              console.log('Error retrieving event: ' + err);
              reject(err);
          } else {
              const events = response.data.items;
              if (events.length === 0) {
                  agent.add(`You have no appointments to modify`);
                  resolve(); // Resolve here since there are no appointments to modify
              } else {
                  const firstEvent = events[0];
                  const name = firstEvent.summary.split("'s Appointment")[0];
                  const mail = firstEvent.description.split(', mail: ')[1];
                  const deletedEventDate = new Date(firstEvent.start.dateTime).toLocaleString(
                      'en-US',
                      { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: timeZone }
                  );
                  agent.add('You have an appointment on '+deletedEventDate+'. When do you want your new appointment to be? Please provide a date, time (include am/pm), and duration(15 or 30 minutes)');
                  resolve();
              }
          }
      });
  });
  return p;
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
  intentMap.set('Sched Slot',makeAppointment );
  intentMap.set('Wrong day', makeAppointment);
  intentMap.set('Wrong time', makeAppointment);
  intentMap.set('Show Available Slots', showAvailableSlots);
  intentMap.set('Get Appointment', getMyAppointments);
  intentMap.set('Cancel Appointment', cancelAppointment );
  intentMap.set('Modify Appointment - custom',modifyAppointment)
  intentMap.set('inquire',showAvailableSlots)
  //intentMap.set('Modify Appointment',modifyAppointment)
  intentMap.set('Modify Appointment - custom - custom',deleteAndadd)
  intentMap.set('Modify Appointment - custom - custom - custom', modifyfollowupAppointment)
  agent.handleRequest(intentMap);

  
});
// app.listen(80, () => {
//   console.log('Server is running on port 80');
// });

var listener = app.listen(process.env.PORT,process.env.IP,function(){
 // console.log("server has started");
  console.log('listening on port '+ listener.address().port);
});


