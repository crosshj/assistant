function getResults(wrapped, callback){
    //console.log(wrapped[9])
    //console.log(flatResolved.map((x, i) => `${i}: ${x.name}`));
    // const testWhich = 4;
    // flatResolved[testWhich]((err, data)=>{
    //     console.log(flatResolved[testWhich].name);
    //     console.log(flatResolved[testWhich].args);
    //     if(err){
    //         return console.log({err});
    //     }
    //     console.log(data);
    // });
    callback(null, wrapped);
}

module.exports = getResults;
