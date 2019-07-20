const processor = ({
    fetchers, converters
}) => (_queue, update) => {
    const genericHandler = (protocol, location) => {
        const strippedLoc = location.replace(protocol + ':', '');
        if(!location.startsWith(protocol)){
            //console.log(`NOT FOUND: ${protocol} - ${strippedLoc}`);
            return false;
        }
        if(fetchers[protocol]){
            // TODO: should be passed a callback which converts then calls update
						const convert = (err, data) => {
							if(err || !data.buffer){
								return update(err || 'probably missing buffer from fetcher', data);
							}
							converters.sphinx(
								data.buffer,
								(err, data) => update(
									err, Object.assign(
										data,
										{ location: strippedLoc }
								))
							)
						};
						return () => fetchers[protocol](protocol, strippedLoc, convert);
        }
        return () => update(undefined, { protocol, location: strippedLoc });
    };
    const handlers = [
        'local-file', 'local-folder',
        'network-file', 'network-folder',
        'dropbox-file', 'dropbox-folder',
        'url'
    ].map(protocol => ({
        handler: location => genericHandler(protocol, location)
    }));

    _queue
        .reduce((all, one)=>{
            handlers.forEach(h => {
                const foundHandler = h.handler(one);
                if(!foundHandler){
                    return;
                }
                foundHandler();
            })
        }, []);
};

module.exports = processor;
