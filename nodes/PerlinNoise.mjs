const definition = {
	// Defines the node name shown in its header
	name: "Perlin Noise",
	// Defines input and output data model properties
	properties: [
		{
			identifier: "scale",
			direction: "in",
			dimensions: "0d",
			type: "float",
			constraints: { default: 10, min: 1 },
		},
		{
			identifier: "seed",
			direction: "in",
			dimensions: "0d",
			type: "int",
			constraints: { default: 0 },
		},
		{
			identifier: "pattern",
			direction: "out",
			dimensions: "2d",
			type: "color",
		},
	],
	// Defines GUI layout information and its bindings to the data model
	rows: [
		{
			// Unique identifier for this row in the node definition
			name: "composite_thumbnail",
			// The widget type for the row to be rendered as
			type: "thumbnail",
			// List of any connector dots hosted on the input and output sides of the row
			connectors: [
				{ identifier: "pattern", direction: "out", dimensions: "2d", type: "color" },
			],
			// Option specific to the widget type
			options: {
				// Tells the thumbnail which output property identifier read its value from to display
				outputBoundIdentifier: "pattern",
			},
		},
		{
			name: "pattern_scale",
			type: "input",
			options: {
				// Tells the input what label to print
				label: "Scale",
				// Tells the input what in property identifier feed with its value
				inputBoundIdentifier: "scale",
			},
			connectors: [
				{ identifier: "scale", direction: "in", dimensions: "0d", type: "float" },
			],
			data: {
				inputValue: 10,
			},
		},
		{
			name: "random_seed",
			type: "input",
			connectors: [
				{ identifier: "seed", direction: "in", dimensions: "0d", type: "int" },
			],
			options: {
				label: "Seed",
				inputBoundIdentifier: "seed",
			},
			data: {
				inputValue: 0,
			},
		},
	],
};

export function getDefinition() {
	return definition;
}

export function validateCompatibleInput(identifier, proposedDataType) {

}

export function updateInputValue(identifier, newValue) {

}

export function recomputeOutputs() {

}