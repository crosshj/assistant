const express = require('express');

const noRedirect = (req, res, next) => {
    res.noRedirect = true;
    next();
};

function keepRoutes(app){
    app.use('/kee', express.static('keep/client', { maxAge: 0 }));

    app.use('/kee', noRedirect);
    app.use('/kee', app.protect);
    app.post('/kee', (req, res) => {
        if(!res.locals.token){
            res.end(res.writeHead(401, 'not acuthorized'));
            return;
        }
        res.json(req.fields);
        // res.redirect(
        // '/kee?' + Object.keys(req.fields)
        //     .reduce((all, x)=> {
        //         all.push(`${x}=${req.fields[x]}`);
        //         return all;
        //     }, [])
        //     .join('&')
        // )
    });
}

module.exports = keepRoutes;
