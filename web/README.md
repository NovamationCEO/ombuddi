# ER3 - Base Template

React + TypeScript + Vite

This template provides a minimal setup to create an ER3 app, with much of the basic functionality already in place.

# Initialization

-   Copy this code to a new directory. You may wish to rename the directory appropriately. If using a cli, you may need to `git switch main` to avoid pulling from a non-existent 'master' branch.
-   Update your version control software to point to a fresh repository (somewhere other than overwriting er3_base).
-   Modify the following files in /web:
    -   index.html
        -   Change the title tag
    -   package.json
        -   Change the name
-   Modify the following files in /service:
    -   docker-compose.yml
        -   er3service becomes the name of your service, lowercase and without spaces
    -   Rename service/.env-temp to service/.env
        -   Complete the file as necessary with database information
-   Modify web/constants/keycloak? Modify keycloak dashboard?

# Starting Localhost

Open two terminals, and Docker Desktop (or equivalent). Be connected through the school's proxy, if you have any database needs.

Frontend prerequisites:

-   Node.js `22.12.0` (or newer in the 22.x/24.x line)
-   Yarn `4.9.1` or newer

If using `nvm`, from `/web` run:

`nvm use`

`/er3_base/web $ yarn dev`

`/er3_base/service $ docker-compose down --remove-orphans; docker-compose build; docker-compose up`

# Frontend Overview

The frontend uses React, Typescript, React-Router, React-Query, and MUI. Folders are:

-   **/assets** Holds images and binary files.
-   **/components** Holds built-in React components you may wish to edit, and any components you create yourself.
-   **/constants** Includes editable sizing for standard screen elements.
-   **/libraries** Contains store.tsx for all global variables (if we're calling it a spade). Also contains ThemingContext, which does not get edited, even if you're changing the theme.
-   **/pages** Each page is a component that (eventually) recieves its own unique URL and holds everything that page contains. You can make them as content-rich as you like, or use them as mere wrappers.
-   **/theme** Contains the file that controls a lot of the base theming. More on that later.
-   **/tools** Hooks and shared functions.
-   **/trusted-components** These components are available to use, but generally do not need to edited. They can be treated as black boxes that perform a specific function - any customization that you need from them should already be baked-in through parameters.
-   **/types** Holds Typescript types. Whenever possible, use types instead of interfaces, as interfaces mostly exist to provide backward compatibility to old code. Types are the future.
-   **/** The only file you need to know is router.tsx, which binds URLS to pages.

# Backend Overview

The backend uses Python, Flask, and Postgres. There are only five files of note:

-   **main.py** Import your blueprints here. Nothing else needs to be changed or added in this file.
-   **pet_views.py** A blueprint with examples of CRUD operations, which are used in the sample page.
-   **second.py** Example of a (blank) blueprint
-   **utils.py** Abstracts most basic database operations to make the blueprints as simple as possible.
-   **.env-temp** If you followed Initialization above, it should already be renamed to simply .env and filled out with database connection information.

pet_views and second can be removed from main.py and deleted whenever you feel comfortable with how they're used. You can create any number of blueprints to add any number of custom routes to the server.

# Frontend Walkthrough

## Add a Page

Let's create a blank "Contact" page. This means making the page, putting it in the router, and adding it the navigation menu.

-   Create a file: **/pages/ContactPage.tsx**
-   Give it some content:

```
import { Box } from '@mui/material'

export function ContactPage() {
    return <Box>This is the Contact Page</Box>
}
```

-   Add it the router. Open **/router.tsx**. Add to the array of pages it knows:

```
 { path: '/contactPage', element: <Page element={<ContactPage />} /> },
```

-   Add it to the navigation panel. Open **/components/NavigationMenu.tsx**
-   Pick an icon from [Material Icons](https://mui.com/material-ui/material-icons/). They should already be populated into Intellisense, too. Let's use "Person."
-   Add your icon, the URL, and the visible label to the array in **NavigationMenu**.

```
 <SidebarLink
    address={'/contactPage'}
    Icon={Person}
    label={'My Super Contact Page'}
/>
```

## Changing Sidebars

-   Open **/constants/uiSizes.ts**
-   Sidebar dimensions can be changed by entering a new number, or individual sidebars can be globally turned off.

## Changing Sidebar Content

This is up to you and the needs of your project. 3 examples are shown:

-   Page Props: in router.tsx, '/profile/:userId' and '/admin' use a modified Page, which has different behavior for the right and bottom sidebar.
-   Store: the upper bar content is handled with a store, useUpperBar.tsx. **/pages/AdminPage.tsx** has an example of importing the setter for the content, then calling it directly.

```
 const setContent = useUpperBar((state) => state.setContent)

    React.useState(() => {
        setContent(<Box></Box>)
    })
```

-   Hooks: **/tools/useSetUpperImage.tsx** is an example of a custom hook that wraps the Store method in a simple one-liner.

```
export function DatabasePage() {
    useSetUpperImage('databasePage.png')
    [...]
}
```

At this time, there isn't a perferred OWSI method of populating sidebars. Decide which makes the most sense for your project. There are dozens of other options, too, but be wary of straying too far from established methods - one of the goals of er3 is to reduce the amount of bespoke code that reduces accessibility and increases cognitive overhead for new employees.

If you have a great new method, consider adding it to er3_base.

## Change Theming

In the sample code, there are two active themes - 'light' and 'dark.' You could have anywhere between 1 and a hundred.

-   Open **/theme/theme.ts**. We'll start with the line `export const themes = {`
-   Note that the top-level keys are the names of specific themes. For example, ``light:`
-   `styles:` this section provides shortcuts to you for theming custom components, or accessing key theme values like its universal 'contrast' color.
-   `theme: createTheme({`: This sets the default styling values for MUI pre-built components. For example, anything with a 'warning' type will use `palette: warning: main` if it's possible, and if it's not overridden in some way.
-   `components: {`: This sets default styling for MUI pre-built components with much higher specificity, targeting explicit parts of individual components. See MUI styling online for more information.

Now, you just need a way to designate and change the active theme. Currently, this is 'themeName' and 'setThemeName' under **/libraries/store.tsx**. An example of setting the theme exists in **/components/Header.tsx**

It is important that every theme has the same keys and general shape. If you add a new component style in one theme, add an equivalent in each theme.

The existing theme file attempts to increase consistency and reasability by defining values outside of the main theme object, including 'base' values that are uniform for a given component across themes, then importing the values with spread operators. Your mileage may vary.

## Use Theming

-   Getting a Specific Value.

```
// /trusted-components/PullTab.tsx
import { useStyles } from '../tools/useStyles'

export function PullTab() {
    const style = useStyles()
    [...]

    return (
        <Box bgcolor={style.sidebar.bgcolor}>
            [...]
        </Box>
    )
}
```

-   Theming a Custom Component

```
// /trusted-components/RoundButton.tsx
import { useStyles } from '../tools/useStyles'

export function RoundButton() {
    const style = useStyles()
    [...]

    return (
        <Box
            {...style.roundButton}
        >
            [...]
        </Box>
    )
}
```

## Database CRUD

First, create a **type** for your database object. This could be as specific as you need for different kinds of operations and payloads - but the convenience of knowing a how a particular entity is formed regardless of its source outweighs the relatively tiny benefit of an (often infinitesimally, realistically) reduction in bandwidth. In my humble, of course. **/types/standardTypes.ts**

```
export type Species = 'cat' | 'dog' | 'penguin'

export type Pet = {
    id: string
    name: string
    speciesName: Species
    color: string
    age: number
    eyeColor: string
}
```

-   Create - **/page/AddDataPage.tsx**

```
    async function save() {
        const payload = { name, speciesName, color, age: Number(age), eyeColor }
        try {
            await creator<Pet>('add_pet', payload)
        } catch (err) {
            console.error(err)
        }
    }
```

This can be dressed up as elaborately as you like, but this is all that's necessary to call for a basic create. 'creator' is given an expected type of 'Pet', then two parameters: the truncated URL of the backend endpoint, and a payload that is suitable to be quietly cast to type `Partial<Pet>` behind the scenes.

By default, truncated URLs are expanded to `${host}/api/v1/${url}`

-   Read - **/page/DatabasePage.tsx**

```
    const petRes = useGetter<Pet[]>(['get_pets_by_species', speciesName])
```

The useGetter hook handles all of the complexity behind the scene. In this case, it's given an expected type of 'Pet[]', because it can return multiple results. In contrast to the other methods, useGetter receives **ONE** parameter: an array of strings. The first element is the truncated URL of the Read endpoint - without the necessary URL parameters. Every other element is a query string that will be built into the finished URL.

Importantly, if any of the elements are `undefined`, the backend will not be contacted. This is wonderful for delaying the execution of a call until all the parameters are loaded or computed. When all elements appear, petRes will populate automatically. There is no need to call useGetter again, or set up 'missing parameter' safety checks.

['React-Query'](https://tanstack.com/query/latest/docs/framework/react/overview) has more information about the structure of 'petRes,' but basically know that

```
petRes: {
    isLoading: true,
    status: 'loading',
    isError: false,
    data: []
}
```

exists immediately. When the query is complete, `petRes.data` will automatically populate with something matching the expected type. (In this case, `<Pet[]>`) If this causes a re-render, it's pretty darn intelligent about not re-rendering more than is necessary.

-   Update - **Looks like I forgot to make an example of this**

```
    async function update() {
        const payload = { id, name, eyeColor }
        try {
            await updater<Pet>('update_pet', payload)
        } catch (err) {
            console.error(err)
        }
    }
```

Basically, the same as Create, except that the payload **must** include an 'id.' Any keys that are not present in the payload will not attempt to update. Any keys in the payload that are explicitly set to 'undefined' will be handled variably, based on the exact backend coding. Most update endpoints will probably use update_one, which will probably try to add 'undefined' as a string.

-   Delete - **/DatabasePage.tsx**

```
 async function remove(id: string) {
    const payload = { id }
    await deleter('remove_pet_by_id', payload)
    petRes.refetch()
}
```

## Other Important Database Stuff

-   In this example, `petRes.refetch()` will manually force the query to be run a second time. This is particularly useful after creating, updating, or deleting, to avoid waiting until the information is 'stale' enough to automatically requery the new values.

## Mapping

Map and layer tooling (Leaflet / React-Leaflet) has been removed from Ombuddi and is no longer part of this frontend template.

## Snackbars

Snackbars are a great tool for showing feedback to a user. To use them, first import them. For example, **/pages/AddDataPage.tsx** has this:

```
import { useStore } from '../libraries/store'
...

    const setSnack = useStore((state) => state.setSnack)

```

Triggering a snackbar looks like this: `setSnack({ message: 'Successfully added ' + name, severity: 'success' })`

'severity' can hold values of 'success', 'error', 'info', or 'warning'. This refers directly to the default MUI colors established in **/theme/themes.ts**.

## Fun Tools

-   isStringArr - Pass it a string. It replies with a boolean letting you know if it's legal to parse it as an array or not, without crashing on false results.
-   toFixedMin - Pass it a number or a stringified number. It will return a string with a minimum (and optional maximum) number of digits after the decimal. Useful for converting 3.1 to '3.10' This is not exactly the same behavior as .toFixed(), since it will not remove digits unless specifically told to.
-   useDebounce - Returns a value after a short delay. If called multiple times, resets the timer instead of creating a queue.
-   useIsAdmin - Check if a user is an admin, redirects them to the home page if they are not. This requires keycloak initalization and a database table User with column isAdmin. Feel free to rewrite this function as necessary for your specific needs.
-   useIsNarrow - Returns whether or not the screen width is below a specific value. Useful for conditional mobile formatting. Note: it will report new values if the screen is resized without needing to be called again.
-   useStyles - Gives access to the current active theme values.

## Notable Trusted Components

Most 'trusted components' you can ignore - they're automatically called when necessary while keeping as much complexity hidden as possible. Changes to their code should be rare. If changes are significant, consider making a fresh component, so as not to confuse OWSI developers switching between projects.

Some you may wish to use on their own, however.

-   Button Container: Automatically spaces its content evenly in a row, right-justified to the parent container. Useful for positioning buttons, but could be used for anything.
-   LeafMark: Adds a clickable marker to a map with a popup message.
-   MySwitch: Hides some of the ugliness that comes from adding a label to a Switch element.

```
<MySwitch
    value={isDisabled}
    setValue={setIsDisabled}
    label={'Disable This Component'}
/>
```

-   RoundButton: Adds a button that stays round, regardless of resizing.
-   SaveCancel: Adds Save and Cancel buttons to the UI with consistent placement and formatting. Pass in functions to onSave and onCancel to define their effects.
-   NumberField: Wraps and replaces `<TextField type={'number'}/>`. Accepts and returns a stringified number. Optionally takes min and max values, 'step' to control the arrow behavior, 'multiple' to round down to multiples of a specific number, 'disabled', and 'helperText' to put tiny text underneath the box. Solves most of the headache of validating in-progress negative and decimal numbers. (e.g. "-." isn't a number! (yet))
-   OverflowTip: A box for text. If the content overflows the box, it becomes visible on mouseover. Useful for tables with a small handful of overlarge cells.

## Data Grid X

[Mui X Data Grid](https://mui.com/x/react-data-grid/) forms the basis of our tables. The component `<DataGridX/>` is a custom wrapper that provides some standardization in formatting.

You need to provide two arrays, at minimum, to define a data grid. Columns are of type GridColDef[], and should be declared as such.

Each object in the column array defines a new column, using at mimimum `{field: uniqueIdentifierString, headerName: string}`. See the online documentation for additional optional parameters, but `{flex: 1}` is a particularly common one, and `{type: 'number'}` applies some automatic right alignment.

Each object in the row array defines one row of the finished grid. The type is technically GridValidRowModel[], but it doesn't need to be explicitly declared. Each object contains, at minimum: `{id: uniqueIdentifierString}` and one key for each 'uniqueIdentifierString' in the column array. For example:

```
const cols: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'age', headerName: 'Age', flex: 1 },
]
const rows = [
    {id: 'bowser001', name: "Bowser", age: 2},
    {id: 'spot001', name: "Spot", age: 11},
    {id: 'bowser002', name: "Bowser", age: 7}
]
```

Additional key/value pairs of note include `{isSub: true}` and `{isAlt: true}`, both of which will provide alternate styling to that row.

Once those are complete, just pass them in.

```
<DataGridX
    columns={cols}
    rows={rows}
/>
```

See **/pages/TablePage.tsx** for examples of other parameters DataGridX can take, including one to allow user download of the table in csv format. **/pages/TableEditPage.tsx** has cells that can be double-clicked to allow user the user to edit on-screen. Both are worth looking at.

If you use the renderCell or renderHeader parameters, I recommend wrapping the JSX in `<RenderHeaderBox>` for better default behavior on narrow screens.

## Notes

You're welcome to use whatever coding style feels right to you. However, in hopes of increasing consistency across OWSI projects, here are some suggestions from the React ecosystem... or just my personal opinion (as primary author of er3_base).

-   'type' has replaced 'interface'. Interfaces actually have a few additional abilities, but they're pretty niche. Interfaces pretty much exist within React and Typescript for backwards compatibility at this point. A single '&' can join types, which is nice. Please note that we're in the 'frontend' section of this ReadMe; this has no bearing whatsoever on Python.
-   Functional components and hooks have effectively replaced classes. Classes still work, but they're not important to the future of React. If you need a class, ask yourself - do I really?
    -   I think it's along the lines of the shock everyone first felt when 'var' and 'let' ceeded ground to 'const.' It seems like it's impossible to write useful code where the variables don't change... then you realize that you're writing better code with way fewer weird interaction bugs and haven't lost any real functionality.
-   Controlled vs. Uncontrolled Components. Controlled components have an explicit value passed into them that is updated through use.

```

const [title, setTitle] = React.useState('')

return (
    <TextField
        value={title}
        onChange={(e)=> setTitle(e.target.value)}
    />
)

```

Uncontrolled components do not have an easily-accessible external value. This is most common within the bounds of `<form>` or some equivalent, and the values are accessed (or automatically processed) through a button with `type={submit}` - again, or equivalent.

This is my personal soapbox, but I find too much value in having immediate access to user input, and the ability to feed it through useEffects to effect immediate changes, that I will use controlled components ten times out of every ten.

React is, frankly, not great with forms. If you feel you must use uncontrolled components, for whatever reason, you should download a package that enhances React's built-in abilities. I don't know which ones to recommend because, again, I don't personally find value in uncontrolled components or forms. That's a purely subjective take - if someone finds a good one that they want to recommend, add it to this ReadMe. Or to er3_base, itself, but please make a note that you have done so, so it isn't just invisible package bloat.

-   Typical parameter names. When I create custom components that need to work with a value, the typical parameters will be 'value' and 'setValue.' If the component has a built-in 'onChange' or equivalent, I'll still use 'setValue' in the wrapper to keep things looking as consistent and easy-to-read as possible.
-   Numbers vs stringified numbers: MUI components seem generally to work better with stringified numbers. This makes Typescript a little less useful, since 'string' is far less specific than 'number.' I don't know what the best compromise is, although I've probably had the most success using stringified numbers for anything that gets passed around the front end through MUI-based components, then converting with `Number()` immediately before sending it to the backend or doing math. Your mileage might vary wildly; I don't have a great all-purpose solution.

# Backend Walkthrough

## Adding a Blueprint File

Blueprints hold a subset of routes, and are useful for organization. They're not strictly necessary, but one big file full of routes gets unmanagable pretty quickly.

-   Create a file. We'll call it 'my_extension,' and put it at: **/service/my_extension_name.py**

```

from flask import Blueprint

my_extension_name = Blueprint('my_extension_name', __name__)

@my_extension_name.route('/test', methods=['GET'])
def test():
    return 'The blueprint linked file is also working. Follow this pattern to compartmentalize your services.'

```

-   Note that my_extension_name also appears after the '@' symbol. This is important.
-   Edit **/service/main.py**

```

from my_extension_name import my_extension_name
app.register_blueprint(my_extension_name)

```

## Making routes

Utils.py exists to cut the amount of useless code down to a minimum. One of its primary tools is the 'model.' Each blueprint starts with a mapping between SQL columns and TypeScript variables.

```

pet_model = {
    'id': 'id',
    'name': 'name',
    'speciesName': 'species_name',
    'color': 'color',
    'age': 'age',
    'eyeColor': 'eye_color',
}

```

SQL columns must be on the right, Typescript variable names must be on the left. The model handles a shocking amount of conversion boilerplate.

-   Create the 'model' for a given blueprint or subset of routes.
-   Create a Route. In this case, we're going to show examples from the 'pet_views' blueprint.
    -   Create: `@pet_views.route('/api/v1/add_pet', methods=['POST'])`
    -   Update: `@pet_views.route('/api/v1/update_pet', methods=['PUT'])`
    -   Delete: `@pet_views.route('/api/v1/remove_pet_by_id', methods=['DELETE'])`

Note that none of these routes have query strings. Personally, I like the name 'remove_pet_by_id' because it's very specific.

After the route decorator, define the actual function. For example:

```

@pet_views.route('/api/v1/remove_pet_by_id', methods=['DELETE'])
def remove_pet_by_id():

```

Read routes, on the other hand, use query strings extensively. This helps React-Query avoid sending incomplete data from the front end, but means that they're structured a little differently.

-   Read: `@pet_views.route('/api/v1/get_pet_by_id/<id>')`
-   Read: `@pet_views.route('/api/v1/get_pets_by_species_and_height_and_ecosystem_id/<species>/<height>/<ecosystem_id>')`

Read functions must include their query parameters as 'regular' parameters, in the proper order. Then, they need a 'constraints' object, with the SQL column names as the keys. This is one place where the model doesn't do any automatic conversion.

```

@pet_views.route('/api/v1/get_pets_by_species/<species>')
def get_pets_by_species(species):
    constraints = {'species_name': species}

```

At this point, you can either write a typical Flask route function to query the db and return a value, or use one of the helper functions in Utils.py.

## Utils.py

-   `add_one`: Add an entry to the database
-   `get_one`: Get the first matching result
-   `get_many`: Get all matching results, returns an array. Multiple query strings are concatinated with AND.
-   `get_many_or`: Get all matching results, returns an array. Multiple query strings are concatingated with OR.
-   `get_many_in`: The constraints in this one are of the format {id: uuid[]}. Any ID value matching anything in the array returns. It does not work with other column_names, beyond 'id.'
-   `get_many_in_by`: The first constraint is the same as it would be for get_many_in. Later constraints are concatinated with AND.
-   `update_one`
-   `remove_one`
-   `remove_many`: Takes an array of UUIDs, much like get_many_in, but deletes them instead of returning them.

With the use of these helper functions, a typical route looks like this:

```

@pet_views.route('/api/v1/get_pets_by_species/<species>')
def get_pets_by_species(species):
    constraints = {'species_name': species}
    return get_many(table_name, pet_model, constraints)

```

See **/service/src/pet_views.py** for more examples.
