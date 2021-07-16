const express = require("express");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is up and running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB error : ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const formatDate = (date) => {
  let tempDate = date.split("-");
  return format(
    new Date(tempDate[0], tempDate[1] - 1, tempDate[2]),
    "yyyy-MM-dd"
  );
};

const isValidDate = (date) => {
  let tempDate = date.split("-");
  return isValid(new Date(tempDate[0], tempDate[1] - 1, tempDate[2]));
};

const validateTodos = (priority, status, category) => {
  let msg = "Invalid Todo ";
  if (
    priority &&
    priority !== "HIGH" &&
    priority !== "MEDIUM" &&
    priority !== "LOW" &&
    priority !== ""
  ) {
    return msg + "Priority";
  } else if (
    category &&
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING" &&
    category !== ""
  ) {
    return msg + "Category";
  } else if (
    status &&
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE" &&
    status !== ""
  ) {
    return msg + "Status";
  }
};

//GET todos API based on filters
app.get("/todos/", async (request, response) => {
  const {
    priority = "",
    status = "",
    search_q = "",
    category = "",
  } = request.query;
  const getTodosQuery = `
  SELECT id,todo,category,priority,status,due_date as dueDate 
  FROM todo
  WHERE priority like "%${priority}%" AND
  status like "%${status}%" AND 
  todo like "%${search_q}%" AND 
  category like "%${category}%";`;
  const todoList = await db.all(getTodosQuery);
  const error = validateTodos(priority, status, category);
  if (error) {
    response.status(400);
    response.send(error);
  } else {
    response.send(todoList);
  }
});

//Get todo API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
  SELECT id,todo,category,priority,status,due_date as dueDate 
  FROM todo 
  WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

//Get agenda API
app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  if (isValidDate(date)) {
    date = formatDate(date);
    const getTodoAgenda = `
    SELECT id,todo,category,priority,status,due_date as dueDate 
    FROM todo
    WHERE due_date = "${date}"`;
    const agenda = await db.all(getTodoAgenda);
    response.send(agenda);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Post Todo API
app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, category, status, dueDate } = todoDetails;
  const addTodoQuery = `
    INSERT INTO
      todo (id,todo,priority,status,category,due_date)
    VALUES
      (
         ${id},
         '${todo}',
         '${priority}',
         '${status}',
         '${category}',
         '${dueDate}'         
      );`;

  const error = validateTodos(priority, status, category);
  if (isValidDate(dueDate)) {
    if (error) {
      response.status(400);
      response.send(error);
    } else {
      await db.run(addTodoQuery);
      response.send("Todo Successfully Added");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//Put Todo API
app.put("/todos/:todoId/", async (request, response) => {
  const todoDetails = request.body;
  const { todoId } = request.params;
  const { todo, status, priority, category, dueDate } = todoDetails;
  let property = todo
    ? "todo"
    : status
    ? "status"
    : priority
    ? "priority"
    : category
    ? "category"
    : "due_date";
  const propertyValue = todo
    ? todo
    : status
    ? status
    : priority
    ? priority
    : category
    ? category
    : dueDate;
  const updateTodoQuery = `
    UPDATE
      todo
    SET
      ${property}='${propertyValue}'
    WHERE
      id = ${todoId};`;

  const error = validateTodos(priority, status, category);
  
  if (property!=="due_date" || property==="due_date" && isValidDate(dueDate)) {
    if (error) {
      response.status(400);
      response.send(error);
    } else {
      await db.run(updateTodoQuery);
      property = property[0].toUpperCase() + property.slice(1);
      if (property === "Due_date") {
        property = "Due Date";
      }
      response.send(`${property} Updated`);
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");      
  }
});

//Delete Todo API
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM
        todo
    WHERE
        id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
