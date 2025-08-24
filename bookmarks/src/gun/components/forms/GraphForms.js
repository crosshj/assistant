// Graph Forms Component - Node and edge creation/editing
export class GraphForms {
	constructor(graph, connection) {
		this.graph = graph;
		this.connection = connection;
	}

	setupEventHandlers() {
		// Node form controls
		$('addNode').onclick = () => {
			this.graph.upsertNode(
				{
					id: $('nodeId').value.trim(),
					label: $('nodeLabel').value.trim(),
					props: tryJSON($('nodeProps').value, {}),
				},
				this.connection
			);
		};

		$('delNode').onclick = () => {
			this.graph.deleteNode($('nodeId').value.trim());
		};

		// Edge form controls
		$('addEdge').onclick = () => {
			this.graph.upsertEdge(
				{
					id: $('edgeId').value.trim(),
					from: $('edgeFrom').value.trim(),
					to: $('edgeTo').value.trim(),
					label: $('edgeLabel').value.trim(),
					direction: $('edgeDirection').value,
					props: tryJSON($('edgeProps').value, {}),
				},
				this.connection
			);
		};

		$('delEdge').onclick = () => {
			this.graph.deleteEdge($('edgeId').value.trim());
		};

		// Utility controls
		$('exportBtn').onclick = async () => {
			if (!window.currentRoom) {
				log('join a room first');
				return;
			}
			window.exportRoom && window.exportRoom();
		};

		$('importFile').onchange = async (ev) => {
			if (!window.currentRoom) {
				log('join a room first');
				return;
			}
			const file = ev.target.files[0];
			if (!file) return;
			const text = await file.text();
			const data = tryJSON(text, null);
			if (!data) {
				log('invalid JSON');
				return;
			}
			window.importRoomData && window.importRoomData(data);
		};

		$('clearLocal').onclick = () => {
			localStorage.clear();
			if (indexedDB.databases) {
				indexedDB
					.databases()
					.then((dbs) =>
						dbs.forEach((db) => indexedDB.deleteDatabase(db.name))
					);
			}
			log('cleared local');
		};
	}

	// Update form fields when elements are selected
	updateNodeForm(nodeData) {
		$('nodeId').value = nodeData.nid || '';
		$('nodeLabel').value = nodeData.label || '';
		$('nodeProps').value = JSON.stringify(nodeData.props || {}, null, 2);
	}

	updateEdgeForm(edgeData) {
		$('edgeId').value = edgeData.eid || '';
		$('edgeFrom').value = edgeData.source?.replace('n_', '') || '';
		$('edgeTo').value = edgeData.target?.replace('n_', '') || '';
		$('edgeLabel').value = edgeData.label || '';
		$('edgeDirection').value = edgeData.direction || 'forward';
		$('edgeProps').value = JSON.stringify(edgeData.props || {}, null, 2);
	}
}

// Helper functions
const $ = (id) => document.getElementById(id);
const log = (msg) => {
	const li = document.createElement('li');
	li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
	$('log').prepend(li);
	console.log(msg);
};
const tryJSON = (t, d) => {
	try {
		return t ? JSON.parse(t) : d;
	} catch {
		return d;
	}
};
