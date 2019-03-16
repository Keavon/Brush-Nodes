const definition = {
	name: "Blend",
	properties: [
		{
			identifier: "foreground",
			direction: "in",
			dimensions: "0d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "background",
			direction: "in",
			dimensions: "0d",
			type: "color",
			constraints: {},
		},
		{
			identifier: "mode",
			direction: "in",
			dimensions: "0d",
			type: "string",
			constraints: { default: "Normal" },
		},
		{
			identifier: "opacity",
			direction: "in",
			dimensions: "2d",
			type: "color",
			constraints: { default: 0.5, min: 0, max: 1 }
		},
		{
			identifier: "composite",
			direction: "out",
			dimensions: "2d",
			type: "color",
		},
	],
	rows: [
		{
			name: "composite_thumbnail",
			type: "thumbnail",
			connectors: [
				{ identifier: "foreground", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "background", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "composite", direction: "out", dimensions: "2d", type: "color" },
			],
			options: {
				outputBoundIdentifier: "composite",
			},
		},
		{
			name: "blend_mode",
			type: "dropdown",
			connectors: [],
			options: {
				inputBoundIdentifier: "mode",
			},
			data: {
				inputValue: 0,
			},
		},
		{
			name: "opacity_mask",
			type: "input",
			connectors: [
				{ identifier: "opacity", direction: "in", dimensions: "2d", type: "color" },
			],
			options: {
				label: "Opacity",
				inputBoundIdentifier: "opacity",
			},
			data: {
				inputValue: 1,
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