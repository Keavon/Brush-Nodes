import * as Node from "/Materialism/js/Node.mjs";

export function getPropertyValue(nodeData, identifier, definition) {
	const row = definition.rows.find(row => row.options && row.options.inputBoundIdentifier === identifier);
	return nodeData.rowData[row.name];
}

export function createWidget(nodeData, row, definition) {
	let value = nodeData.rowData[row.name].inputValue;
	if (value === undefined) {
		const property = definition.properties.find(property => property.identifier === row.options.inputBoundIdentifier);
		value = property.default;
		nodeData.rowData[row.name].inputValue = value;
	}

	const labelElement = document.createElement("label");
	labelElement.innerHTML = row.options.label;

	const inputElement = document.createElement("input");
	inputElement.type = "number";
	inputElement.value = value;
	inputElement.addEventListener("input", event => inputChangeHandler(event, nodeData, row, false));
	inputElement.addEventListener("change", event => inputChangeHandler(event, nodeData, row, true));


	// Allow the input field to be dragged across to quickly change the value

	// The multiplier to change how sensitive the mouse is
	const MOVEMENT_RATE = 1 / 600;
	// An unrounded value for smooth dragging
	let rawValue = value;
	// Is the input currently being edited with text input?
	let focused = false;
	// Is the input currently being dragged?
	let dragging = false;
	// Has the user clicked down on the input?
	let readyToDrag = false;

	// Use a horizontal arrow cursor to show users it can be dragged
	inputElement.style.cursor = "w-resize";

	// Initialize drag to false
	inputElement.onpointerdown = () => {
		dragging = false;
		readyToDrag = true;
	};

	inputElement.onfocus = () => {
		if (dragging) {
			// Don't focus the element when it has just been dragged
			inputElement.blur();
		} else {
			// Reset cursor for text entry
			inputElement.style.cursor = "auto";
			focused = true;
		}
	}

	inputElement.onblur = () => {
		// Once text input complete, revert back to a horizontal arrow
		inputElement.style.cursor = "w-resize";
		focused = false;
	}

	inputElement.onpointermove = (event) => {
		if (event.buttons === 1 && !focused && readyToDrag) {
			// Initialize the drag
			if (!dragging) {
				dragging = true;
				inputElement.setPointerCapture(event.pointerId);
				rawValue = inputElement.value;
				inputElement.tabIndex = "";
			}

			// Calculate a scalar multiplier factor
			const movement = event.movementX;
			let scalarMultiplier = 1 + Math.abs(movement) * MOVEMENT_RATE;
			if (movement < 0) scalarMultiplier = 1 / scalarMultiplier;

			// Update the value
			rawValue *= scalarMultiplier;
			inputElement.value = Math.round(rawValue * 1000) / 1000;
			inputChangeHandler(event, nodeData, row, false);
		}
	};

	inputElement.onpointerup = (event) => {
		if (dragging) {
			// Commit the change
			inputChangeHandler(event, nodeData, row, true);
			inputElement.releasePointerCapture(event.pointerId);
		}
		readyToDrag = false;
	};

	labelElement.appendChild(inputElement);
	return labelElement;
}

export function updateElementDisplayValue(nodeData, row) {
	const rowElement = nodeData.element.querySelector(`.row[data-name="${row.name}"]`);
	rowElement.querySelector("input").value = row.data.inputValue;
}

export function resetRowDataToPropertyValue(nodeData, rowData, rowDefinition) {
	const identifier = rowDefinition.options.inputBoundIdentifier;
	const value = nodeData.propertyValues[identifier];
	rowData.inputValue = value;
}

async function inputChangeHandler(event, nodeData, row, recomputeGraphDownstream) {
	const newValue = validate(event.target.value);

	// Update the row's widget state data
	const savedRowData = nodeData.rowData[row.name];
	savedRowData.inputValue = newValue;

	// Update the current property value
	const propertyIdentifier = row.options.inputBoundIdentifier;
	Node.setPropertyValue(nodeData, propertyIdentifier, newValue)

	// Recompute this node with the new input
	await Node.recomputeProperties(nodeData);

	// If the user is finished tweaking this input, recompute the whole downstream graph
	if (recomputeGraphDownstream) await Node.recomputeDownstreamNodes(nodeData);
}

function validate(value) {
	return Number(value);
}
