export type Species = 'cat' | 'dog' | 'penguin'

export type Pet = {
    id: string
    name: string
    speciesName: Species
    color: string
    age: number
    eyeColor: string
}

export type GenericResponse = {
    message: string
    error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObj = { [x: string]: any }
