const {
  Client,
  logger, 
  Variables
} = require("camunda-external-task-client-js");

// configuration for the Client:
//  - 'baseUrl': url to the Workflow Engine
//  - 'logger': utility to automatically log important events
const config = {
  baseUrl: "http://localhost:8080/engine-rest",
  use: logger
};

// create a Client instance with custom configuration
const deductWorker = new Client(config);
const chargeWorker = new Client(config);

// susbscribe to the topic: 'creditScoreChecker'
deductWorker.subscribe("deduct-amount", async function ({
  task,
  taskService
}) {
  // Put your business logic
  // complete the task

  const shouldFail = task.variables.get("shouldFail");
  if (shouldFail) {
    await taskService.handleFailure(task, {
      errorMessage: "some failure message",
      errorDetails: "some details",
      retries: 0,
      retryTimeout: 1000
    });
  } else {
    const amount = task.variables.get("amount");
    const credit = task.variables.get("credit");
    const resultVars = new Variables();

    console.log(`amount: ${amount}`);
    console.log(`credit: ${credit}`);

    if (credit - amount >= 0) {
      resultVars.set("creditSufficient", true);
      console.log(logger.success("set creditSufficent variable to true"));
      resultVars.set("credit", credit - amount);
    } else {
      resultVars.set("creditSufficient", false);
      console.log(logger.success("set creditSufficent variable to false"));
    }
    await taskService.complete(task, resultVars);

  }
});

chargeWorker.subscribe('charge-payment', async function ({
  task, 
  taskService
}) {
  const paymentFailed = task.variables.get("paymentFailed");

  if (paymentFailed) {
    const variables = new Variables().set('fixable', true);
    await taskService.handleBpmnError(task, "PaymentFailed", "Some error message", variables);
  } else {
    console.log(logger.success("charge payment worker executed"));
    const credit = task.variables.get("credit");
    console.log(`remaining credit: ${credit}`);
    await taskService.complete(task);
  }
  
});
