# MDXT Syntax Cheatsheet

Markdown Extended

Add new components and logic to markdown allowing you to create interactive docs all in a 1.53kb package.

## Layout

symbol[id]{state/condition}

| Symbol | Type |
| --- | --- |
| @ | Variable input/output  |
| ? | Display if |
| > | Execute |
| # | Component |
| % | Loop |
| ```> | Execute code |

## Variable input/output

```text
@[id:type]{default}(parameters)
```

### id

The id parameter will be the selector used when referencing the output in the future

### type

- text
- number
- select
- textarea
- checkbox
- radio

The type parameter is set by appending a `:` after the id, by default, it is set to text

```text
@[id:number]{10}
```

### default

Default is the default value the input will be rendered with

### parameters

these will be injected into the tag itself

```text
@[id:checkbox]{true}(role=“switch”)
```

### Displaying the Output

To use the output of an input using the format below

```text
@{id}
```

If this is called outside an expression it will be inserted into the document as text. If it is called in inside an expression it will be parsed into either a Boolean, float/int or string.

### Grouping Inputs

Use the # like below to group inputs together

```text
@[#id:type]{default}

@[#id:type]{default}
```

To use the outputs of these elements add an index at the end of the variable reference

```text
@{id}[0]
```

### Special Cases

If you want to use the type select here is the basic format

```text
@[id:select]{0}
    [Label](value)

    [Label 2](0)
```

In this case, because the default value is 0, “Label 2” would be selected as the default and the output of the `@{id}` would be `0`

### Additional Parameters

To add html parameters like an inline style add parentheses to the end of the line like below

```text
@[id:type]{default}(style=“color: black;”)
```

### Labels

If you want to add a label to an input, anything after the tag declaration and a space character will be inserted as a label tag

```text
@[id:type]{default} This is a label
```

## Execute

To execute code that is reactive to variables use the > operator as follows

```text
>{@{number} + 2}
```

This acts the same as the variable, outputting to the document if not used in an if statement. if you only want to make one declaration, you can append an id to the executable statement and reference it the same as a variable.

```text
>[id]{@{number} + 2}
```

`@{id}` would output the result of the executed code and it will update as the variables within the statement update

## Display If

To use a display if condition, first define the condition statement with a question mark and a set of curly brackets with the condition inside it. The display if will only render the content inside if the condition is true. Display if statements cannot contain an execute statement as the content is executed the same way. The content intended to be displayed goes underneath the initiator indented with a single tab character.

```text
?{condition}
    Content to be displayed if true
```

## Component

MDXT contains a set of components that are missing from markdown that can be used for document layout and are not reactive by default but can be made reactive using MDXT.

To initialize a component use the pound sign followed by curly brackets with the target components’ name inside and the content of the component indented underneath.

```text
#{component}
    Content
```

### Columns

Columns are an flexbox container that adjusts with the content inside of the box, evenly spacing the containers inside the box. To define the columns, use a row of equals sign of any length. This will divide the content into separate containers within the flexbox element.

```text
#{column}
    Container 1

    =======================

    Container 2
```

### Accordion

Accordions can be used to display content in a compact format. To use the accordion component define an accordion component and underneath place the labels in square brackets and the content to be displayed inside under the label.

```text
#{accordion}
    [Label 1]

    This is shown open by default

    [Label 2]

    This is hidden until opened
```

## Code

MDXT comes out of the box with code highlighting, if no language is specified it will attempt to auto-detect the language. The syntax highlighting is done via highlight.js and supports all of the languages highlight.js supports. If you prefer no syntax highlighting add none in place of the language name.

Optionally if you are using JavaScript, you are about to render and display the output of your code, including errors by appending a greater than sign before the language definition.

```text
’’’python

python code

‘’’
```

Executing code with console output

```text
’’’>javascript

let x = “Hello world”;

console.log(x);

‘’’
```

- These are not copy and pastable, but only for example.

All code executed on the server side is done in the Node.JS vm module. This is not secure, however, it does provide a fairly safe space to run trusted code without exposing your server to most attacks. You should not allow just anyone to render documents on the server as running any untrusted code on a server is always dangerous. However, because the document is rendered server-side no one on the client side is able to run the code inside.

## Loops

The loop operator is defined by the `%` symbol and allows for generating variable length content. The syntax is as below, in the first group define the varibles you want to use inside of the loop. The first one is the current index of the loop and the second is the total amount of times to be looped over. The next group is the amount of times to loop over, this can be a integer or a input that returns a integer. The content intended to be repeated goes underneath tabbed over, this will repeat in the final document.

```text
%[index, length]{amount}
    @{index} of @{length}
```
