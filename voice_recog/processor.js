const processor = () => (_queue, update) => {
    const genericHandler = (protocol, location, _update) => {
        const strippedLoc = location.replace(protocol + ':', '');
        if(!location.startsWith(protocol)){
            //console.log(`NOT FOUND: ${protocol} - ${strippedLoc}`);
            return false;
        }
        return () => _update(undefined, { protocol, location: strippedLoc });
    };
    const handlers = [
        'local-file', 'local-folder',
        'network-file', 'network-folder',
        'dropbox-file', 'dropbox-folder',
        'url'
    ].map(protocol => ({
        handler: location => genericHandler(protocol, location, update)
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
