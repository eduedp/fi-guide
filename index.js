/* Usable Sysbols ◎●←↑→↓↖↗↘↙ */

const mapID = [9059, 9759];					// MAP ID to input [ Normal Mode , Hard Mode ]

const FirstBossActions = {
	104: {msg: 'Jump'},
	106: {msg: 'Spin'}
};

const SecondBossActions = {
	3107: {msg: 'Dodge'},
	3101: {msg: 'Push'},
	3104: {msg: 'BIG AOE'}
	//107: {msg: 'targeted aoe'}
};

const ThirdBossActions = {
	101: {msg: 'Explo'},
	102: {msg: 'Pull'},
	105: {msg: 'Dodge'},
	//3108: {msg: 'Curse'},
	110: {msg: 'GET OUT'}
};

module.exports = function fi_guide(mod) {
	const command = mod.command;
	let hooks = [],
		hardmode = false,
		bossCurLocation,
		bossCurAngle,
		npcs = new Map(),
		uid0 = 999999999n,
		sendToParty = false,
		enabled = true,
		itemhelper = true,
	   	streamenabled = false;

	mod.hook('S_LOAD_TOPO', 3, (event) => {
		if (event.zone === mapID[0])
		{
			command.message('Welcome to FI - Normal Mode');
			hardmode = false;
			load();
		}
		else if (event.zone === mapID[1]) {
			command.message('Welcome to FI - Hard Mode');
			hardmode = true;
			load();
		}
		else
		{
			unload();
		}
    });

	command.add(['fi', '!fi'], {
        $none() {
            enabled = !enabled;
			command.message('FI Guide '+(enabled ? 'Enabled' : 'Disabled') + '.');
		},
		$default() {
			command.message('Error (typo?) in command! see README for the list of valid commands')
		},
		itemhelp() {
			if(streamenabled) {
				command.message('Can\'t enable item helper when stream mode is on.');
			} else {
				itemhelper = !itemhelper;
				command.message('Item helper '+(itemhelper ? 'Enabled' : 'Disabled') + '.');
			}
		},
		toparty() {
			streamenabled = false;
			sendToParty = !sendToParty;
			command.message((sendToParty ? 'FI Guide - Messages will be sent to the party' : 'FI Guide - Only you will see messages in chat'));
		},
		stream() {
				streamenabled = !streamenabled;
				sendToParty = false;
				itemhelper = false;
				command.message((streamenabled ? 'Stream mode Enabled' : 'Stream mode Disabled'));
		}
	});

	function sendMessage(msg)
	{
		if (sendToParty)
		{
			mod.toServer('C_CHAT', 1, {
			channel: 1, //21 = p-notice, 1 = party, 2 = guild
			message: msg
			});
		}
		else if(streamenabled)
		{
			command.message(msg);
		}
		else
		{
			mod.toClient('S_CHAT', 1, {
			channel: 21, //21 = p-notice, 1 = party
			authorName: 'DG-Guide',
			message: msg
			});
		}
	}

	function Spawnitem(item, offset, degrees, radius, lifetime) {
		let r = null, rads = null, finalrad = null, pos = {};

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		pos.x = bossCurLocation.x + offset.x * Math.cos(r) - offset.y * Math.sin(r) + radius * Math.cos(finalrad);
		pos.y = bossCurLocation.y + offset.y * Math.cos(r) + offset.x * Math.sin(r) + radius * Math.sin(finalrad);
		pos.z = bossCurLocation.z;

		mod.send('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : pos,
			w : r,
			unk1 : 0,
			unk2 : 0
		});

		setTimeout(Despawn, lifetime, uid0);
		uid0--;
	}

	function Despawn(uid_arg0) {
		mod.send('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}

	function SpawnitemCircle(item, offset, intervalDegrees, radius, lifetime)
	{
		for (var degrees=0; degrees<360; degrees+=intervalDegrees)
		{
			Spawnitem(item, offset, degrees, radius, lifetime);
		}
	}

	function SpawnitemCross(item, center, length, lifetime)
	{
		for (var i=1; i<length; i+=100)
		{
			Spawnitem(item, center, 0, i, lifetime);
			Spawnitem(item, center, 90, i, lifetime);
			Spawnitem(item, center, 180, i, lifetime);
			Spawnitem(item, center, 270, i, lifetime);
		}
	}

	function getNPCLoc(id) {
		return npcs.get(id);
	}

	function load()
	{
		if(!hooks.length)
		{
			hook('S_ACTION_STAGE', 9, (event) => {
				if(!enabled || event.stage != 0) return;

				if (event.templateId === 1003)
				{
					bossCurLocation = event.loc;
					bossCurAngle = event.w;
					let skill = event.skill.id % 1000;
					if(ThirdBossActions[skill])
					{
						sendMessage(ThirdBossActions[skill].msg);
						if(skill == 110 && itemhelper) { // melee AoE
							SpawnitemCircle(553, {x: 150, y: 150}, 10, 200, 4000);
				      SpawnitemCircle(553, {x: -150, y: 150}, 10, 200, 4000);
				      SpawnitemCircle(553, {x: 150, y: -150}, 10, 200, 4000);
				      SpawnitemCircle(553, {x: -150, y: -150}, 10, 200, 4000);
						}
					} /*else if (hardmode && (skill == 106 || skill == 107 || (skill == 108 && event.skill.id != 3108) || skill == 109)) { // targetted attacks, but 3108 is the curse
						command.message(
							"target: " + event.target
						);//debug, to find the ID of the pylons in HM
						SpawnitemCross(537, getNPCLoc(event.target), 1000, 3000);
					}*/
				}
				else if (event.templateId === 1004 || event.templateId === 1001)
				{
					let skill = event.skill.id % 1000;
					if(FirstBossActions[skill])
					{
						sendMessage(FirstBossActions[skill].msg);
					}
				}
				else if (event.templateId === 1005 || event.templateId === 1002)
				{
					let skill = event.skill.id;
					if(SecondBossActions[skill]) //second boss works with exact skill IDs
					{
						sendMessage(SecondBossActions[skill].msg);
					}
				}
			});
			hook('S_SPAWN_NPC', 11, (event) => {
				npcs.set(event.gameId, event.loc);
				/*if(event.templateId >1000 && event.templateId <1006) {
					bossCurLocation = event.loc;
					bossCurAngle = event.w;
				}*/
			});
			hook('S_DESPAWN_NPC', 3, (event) => {
				npcs.delete(event.gameId);
			});
			hook('S_NPC_LOCATION', 3, (event) => {
				npcs.set(event.gameId, event.loc);
				/*if(event.templateId >1000 && event.templateId <1006) {
					bossCurLocation = event.loc;
					bossCurAngle = event.w;
				}*/
			});
		}
	}

	function unload()
	{
		if(hooks.length)
		{
			for(let h of hooks) mod.unhook(h);

			hooks = []
		}
		npcs.clear()
	}

	function hook()
	{
		hooks.push(mod.hook(...arguments));
	}
}
