- There were several past attempts at this Lambda, mostly of organizing structure. All past Lambdas have failed to acheive any kind of interim progress. They have only gotten so far as creating an EC2 instance, promising a usable SSH connection, and then hanging or fizzling out.

- Lacking knowledge of design patterns for OOP on the server side, Controllers and Services were used. The use of Services to encapsulate long running processes into atomic methods makes sense in any tree-like organizational structure. 

- Controllers were implemented hesitantly, as their semantics and flow made little sense. AWS Lambda requires the use of a Handler, which can optionally be written as an async function. A Handler would concern itself only with receiving the incoming request and summoning the appropriate action. A Controller would administer the appropriate action with calls to Services. In actuality, this left a Handler calling a Controller as its only concern with the Controller containing long, drawn-out methods. As well, the methods had little means of separating simultaneous functionalities cleanly.

- MySQL-driven logging is the only secondary functionality that has to be threaded. It has to interact with every Service.

- It appears easier to use a single, central event system, where cleanly separated functionalities can listen and emit across synchronized timelines.

- Data can be accessed in two major ways: 1) Incorporating the data into parent structures and signaling siblings to go forward with the inherited data. 2) Passing data through an event from emitter to listener.

- Stepping can be had more easily if the events are modular in structure and chronological in arrangement