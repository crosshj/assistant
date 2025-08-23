/**
 * Room UI Controller
 * Pure UI rendering based on state - no business logic
 */
export class RoomUI {
	constructor() {
		this.elements = {
			input: document.getElementById('room'),
			joinBtn: document.getElementById('join'),
			status: document.getElementById('roomStatus'),
		};
	}

	// Render UI based on room state
	render(roomState, canJoin) {
		switch (roomState.status) {
			case 'not_joined':
				this._renderNotJoined(roomState, canJoin);
				break;
			case 'joining':
				this._renderJoining(roomState);
				break;
			case 'joined':
				this._renderJoined(roomState);
				break;
		}
	}

	_renderNotJoined(state, canJoin) {
		// Show input field when not joined
		this.elements.input.style.display = 'inline-block';
		this.elements.input.disabled = false;
		this.elements.input.title = canJoin
			? 'Enter room name to join'
			: 'Cannot join room: No connection available';

		// Hide status pill when not joined
		this.elements.status.style.display = 'none';

		// Button: Join (enabled/disabled based on connection)
		this.elements.joinBtn.textContent = 'Join';
		if (canJoin) {
			this.elements.joinBtn.className = 'primary';
			this.elements.joinBtn.disabled = false;
		} else {
			this.elements.joinBtn.className = 'secondary';
			this.elements.joinBtn.disabled = true;
		}
	}

	_renderJoining(state) {
		// Show input field during join (but disabled)
		this.elements.input.style.display = 'inline-block';
		this.elements.input.disabled = true;
		this.elements.input.title = `Joining room: ${state.name}`;

		// Hide status pill during join
		this.elements.status.style.display = 'none';

		// Button: disabled during join
		this.elements.joinBtn.textContent = 'Joining...';
		this.elements.joinBtn.className = 'secondary';
		this.elements.joinBtn.disabled = true;
	}

	_renderJoined(state) {
		// Hide input field when joined
		this.elements.input.style.display = 'none';

		// Show room status pill
		this.elements.status.style.display = 'inline-block';
		this.elements.status.textContent = `📊 ${state.name}`;
		this.elements.status.title = `Currently in room: ${state.name}`;

		// Button: Leave
		this.elements.joinBtn.textContent = 'Leave';
		this.elements.joinBtn.className = 'secondary';
		this.elements.joinBtn.disabled = false;
	}
}
