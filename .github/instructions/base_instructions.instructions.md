---
applyTo: '**'
---
[
    {
        "importance": "must follow",
        "instruction": "Do not create readme files for every change that you do, update the main readme file instead."
    },
    {
        "importance": "must follow",
        "instruction": "Update ./testing/openapi.yaml to reflect any changes in the API endpoints, request/response formats, and authentication methods."
    },
    {
        "importance": "must follow",
        "instruction": "When connecting the frontend to the backend, make sure to properly understand the response strucuture that will be returned from the backend. Don't blindly implement frontend code."
    },
    {
        "importance": "must follow",
        "instruction": "When implementing any frontend related code that interacts with the backend, make sure to undestand the repsonse structure properly by reading the backend code, handle all the errros that could happen during the API call and display proper error messages to the user."
    },
    {
        "importance": "must follow",
        "instruction": "When redirecting user to a page, always construct the redirection relative to the base url."
    },
    {
        "importance": "must follow",
        "instruction": "Properly create the migrations based on the current migrations format. And run them as well, it's better if you can create a migrations manager that will automatically handle the migrations by analyzing the current database schema, or by maintaining a migration version and running the new ones. When creating the migrations, make sure to show attention to currently existing data as well."
    },
    {
        "importance": "must follow",
        "instruction": "Any time you change the database schema — adding/removing/renaming tables or columns, changing column types, adding indexes or foreign keys, or seeding required data — you MUST create a new numbered migration file in migrations/ before applying the change. Never modify the database directly or alter existing migration files. Follow the migration file conventions in migrations.instructions.md."
    },
    {
        "importance": "should follow",
        "instruction": "When adding new API endpoint, make sure to update the postman collection in testing/postman with the new API endpoints."
    }
]

