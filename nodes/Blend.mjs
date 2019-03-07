const blueprint = {
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
			identifier: "blendMode",
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
			display: "thumbnail",
			options: {
				outputBoundIdentifier: "composite",
			},
			connectors: [
				{ identifier: "foreground", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "background", direction: "in", dimensions: "2d", type: "color" },
				{ identifier: "composite", direction: "out", dimensions: "2d", type: "color" },
			],
		},
		{
			display: "dropdown",
			options: {
				inputBoundIdentifier: "blendMode",
			},
			connectors: [],
		},
		{
			display: "input",
			options: {
				label: "Opacity",
				inputBoundIdentifier: "opacity",
			},
			connectors: [
				{ identifier: "opacity", direction: "in", dimensions: "2d", type: "color" },
			],
		},
	],
};

export function getBlueprint() {
	return blueprint;
}

export function validateCompatibleInput(identifier, proposedDataType) {

}

export function updateInputValue(identifier, newValue) {

}

export function recomputeOutputs() {

}