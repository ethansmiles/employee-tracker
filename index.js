import inquirer from 'inquirer';
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
import e from 'express';
import { isJsxOpeningElement } from 'typescript';
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: 'localhost',
  database: process.env.DB_NAME,
  port: 5432,
});

const connectToDb = async () => {
  try {
    await pool.connect();
    console.log('Connected to the database.');
    await mainMenu();
  } catch (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
};

const mainMenu = async () => {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'View all employees',
        'Add an employee',
        'Update an employee',
        'Delete an employee',
        'View all departments',
        'Add a department',
        'View all roles',
        'Add a role',
        'Exit',
      ],
    },
  ]);

  switch (action) {
    case 'View all employees':
      await viewAllEmployees();
      break;
    case 'Add an employee':
      await addEmployee();
      break;
    case 'Update an employee':
      await updateEmployee();
      break;
      case 'Delete an employee':  
      await deleteEmployee(); 
      break;
    case 'View all departments':
      await viewAllDepartments();
      break;
    case 'Add a department':
      await addDepartment();
      break;
    case 'View all roles':
      await viewAllRoles();
      break;
    case 'Add a role':
      await addRole();
      break;
    case 'Exit':
      await pool.end();
      console.log('Goodbye!');
      process.exit(0);
  }
};


const viewAllEmployees = async () => {
  try {
    const res = await pool.query(`
      SELECT 
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        r.title AS role,
        r.salary AS salary,
        CONCAT(m.first_name, ' ', m.last_name) AS manager
      FROM 
        employees AS e
      LEFT JOIN 
        roles AS r ON e.role_id = r.id
      LEFT JOIN 
        employees AS m ON e.manager_id = m.id;
    `);
    console.table(res.rows); 
    await mainMenu(); 
  } catch (err) {
    console.error('Error fetching employees:', err);
  }
};


const addEmployee = async () => {
  const rolesRes = await pool.query('SELECT id, title FROM roles');
  const roles = rolesRes.rows;

  const { firstName, lastName, roleId, managerId, salary } = await inquirer.prompt([
    {
      type: 'input',
      name: 'firstName',
      message: "Enter the employee's first name:",
    },
    {
      type: 'input',
      name: 'lastName',
      message: "Enter the employee's last name:",
    },
    {
      type: 'list',
      name: 'roleId',
      message: "Select the employee's role:",
      choices: roles.map(role => ({ name: role.title, value: role.id })),
    },
    {
      type: 'input',
      name: 'salary',
      message: "Enter the employee's salary:",
    },
    {
      type: 'input',
      name: 'managerId',
      message: "Enter the employee's manager ID (leave blank if none):",
    },
  ]);

  try {
    const managerIdValue = managerId ? managerId : null;
    const salaryValue = salary ? salary : null;

    await pool.query(
      'INSERT INTO employees (first_name, last_name, role_id, manager_id, salary) VALUES ($1, $2, $3, $4, $5)',
      [firstName, lastName, roleId, managerIdValue, salaryValue]
    );
    console.log('Employee added successfully!');
  } catch (err) {
    console.error('Error adding employee:', err);
  }

  await mainMenu(); 
};

const deleteEmployee = async () => {
  try {
    const res = await pool.query('SELECT id, first_name, last_name FROM employees');
    const employees = res.rows;

    if (employees.length === 0) {
      console.log('No employees to delete.');
      return await mainMenu();
    }

    const { employeeId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'employeeId',
        message: 'Select the employee you want to delete:',
        choices: employees.map(employee => ({
          name: `${employee.first_name} ${employee.last_name}`,
          value: employee.id
        })),
      }
    ]);

    await pool.query('DELETE FROM employees WHERE id = $1', [employeeId]);
    console.log('Employee deleted successfully!');
    
  } catch (err) {
    console.error('Error deleting employee:', err);
  }

  await mainMenu(); 
};


const updateEmployee = async () => {
  const { employeeId, newRoleId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'employeeId',
      message: "Enter the employee's ID to update:",
    },
    {
      type: 'input',
      name: 'newRoleId',
      message: "Enter the new role ID for the employee:",
    },
  ]);

  try {
    await pool.query(
      'UPDATE employees SET role_id = $1 WHERE id = $2',
      [newRoleId, employeeId]
    );
    console.log('Employee updated successfully!');
  } catch (err) {
    console.error('Error updating employee:', err);
  }

  await mainMenu();
};


const viewAllDepartments = async () => {
  try {
    const res = await pool.query('SELECT * FROM departments');
    console.table(res.rows);
    await mainMenu();
  } catch (err) {
    console.error('Error fetching departments:', err);
  }
};


const addDepartment = async () => {
  const { departmentName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'departmentName',
      message: "Enter the department's name:",
    },
  ]);

  try {
    await pool.query('INSERT INTO departments (name) VALUES ($1)', [departmentName]);
    console.log('Department added successfully!');
  } catch (err) {
    console.error('Error adding department:', err);
  }

  await mainMenu();
};


const viewAllRoles = async () => {
  try {
    const res = await pool.query('SELECT * FROM roles');
    console.table(res.rows);
    await mainMenu();
  } catch (err) {
    console.error('Error fetching roles:', err);
  }
};


const addRole = async () => {
  const { roleTitle, salary, departmentId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'roleTitle',
      message: "Enter the role's title:",
    },
    {
      type: 'input',
      name: 'salary',
      message: "Enter the salary for this role:",
    },
    {
      type: 'input',
      name: 'departmentId',
      message: "Enter the department ID for this role:",
    },
  ]);

    try {
      await pool.query(
        'INSERT INTO roles (title, salary, department_id) VALUES ($1, $2, $3)',
        [roleTitle, salary, departmentId]
      );
      console.log('Role added successfully!');
    } catch (err) {
      console.error('Error adding role:', err);
    }
  
    await mainMenu();
  };
  

connectToDb();

export { pool, connectToDb };