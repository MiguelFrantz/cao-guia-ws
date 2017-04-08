//var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var pgp = require('pg-promise')();

var app = express();

app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', (req, res) => {
    res.send('Node is running');
});

app.get('/login', (req, res) => {
    var connection = {
        host: '127.0.0.1',
        database: '*****',
        user: '*****',
        password: '*****'
    };
    var db = pgp(connection);

    var id_cao = req.query.id;

    db.one("select * from cao where id_cao=$1", id_cao)
    .then(function (user) {
        var id_cao = user.id_cao;
        var id_socializador = user.cpf;
        
        db.one("select * from socializador where cpf=$1", id_socializador)
        .then(function (user) {
            res.json({
                error: false,
                id: id_cao,
                socializador: user.nome
            });
        })        
        .catch(function (error) {
            console.log("ERROR:", error.message || error);
            res.json({
                error: true,
                message: "Socializador não identificado"
            });
        });
    })
    .catch(function (error) {
        console.log("ERROR:", error.message || error);
        res.json({
            error: true,
            message: "Nenhum registro de cão encontrado referente ao código informado"
        });
    });
});

app.post('/receivedata', (req, res) => {
    console.log(req.body);
    console.log("-------------");
    console.log(req.body.trajetoria);
    // fs.writeFileSync(
    //  `trajetorias-teste/${Date.now()}.json`, 
    //  JSON.stringify(req.body)
    // );

    // -------------- Salvando no Banco de Dados --------------
    var connection = {
        host: '127.0.0.1',
        database: '*****',
        user: '*****',
        password: '*****'
    };
    var db = pgp(connection);
    // db.one("insert into teste(nome) values($1) returning id", ['John'])
    // .then(function (data) {
    //     console.log(data.id); // print new user id;
    // })
    // .catch(function (error) {
    //     console.log("ERROR:", error.message || error); // print error;
    // });

    // Inserir a trajetória (id_cao, id_dispositivo). Pegar chave primaria da trajetoria inserida
    db.one("insert into trajetoria(id_cao, id_dispositivo) values($1, $2) returning id_trajetoria", [req.body.id_cao, req.body.id_dispositivo])
    .then(function (data) {
        var id_trajetoria = data.id_trajetoria;
        console.log ("Id Trajetória: " + id_trajetoria);
        res.json({
            error: false,
            id_trajetoria: id_trajetoria
        });
        // Inserir conjunto de pontos referentes a cada subtrajetoria (coordenada, tempo, precisao, id_subtrajetoria)
        // performance-optimized, reusable set of columns:
        var cs = new pgp.helpers.ColumnSet(['coordenada', 'tempo', 'precisao', 'id_subtrajetoria'], {table: 'ponto'});
        // Loop para percorrer todas as subtrajetorias
        var totalSubTrajetoria = req.body.trajetoria.length;
        for (var i = 0; i < totalSubTrajetoria; i++){
            // Testa se a subtrajetória não está vazia
            if ( req.body.trajetoria[i].length ){
                (function(data, i, pgp, db, req){
                    // Inserir subtrajetoria (id_trajetoria). Pegar a chave primaria da subtrajetoria inserida
                    db.one("insert into subtrajetoria(id_trajetoria) values($1) returning id_subtrajetoria", [id_trajetoria])
                    .then(function (data) {
                        var id_subtrajetoria = data.id_subtrajetoria;
                        var values = req.body.trajetoria[i];
                        values.filter(function(value){
                            value.id_subtrajetoria = id_subtrajetoria;
                            return value;
                        });
                        // generating a multi-row insert query:
                        var query = pgp.helpers.insert(values, cs);
                        //=> INSERT INTO "tmp"("col_a","col_b") VALUES('a1','b1'),('a2','b2')
                        // executing the query:
                        db.none(query)
                            .then(data=> {
                                // success;
                                console.log("Registros inseridos com sucesso");
                            })
                            .catch(error=> {
                                // error;
                                console.log("ERROR:", error.message || error);
                                res.json({
                                    error: true,
                                    message: (error.message || error)
                                });
                            });
                    })
                    .catch(function (error) {
                        console.log("ERROR:", error.message || error);
                        res.json({
                            error: true,
                            message: (error.message || error)
                        });
                    });
                })(data, i, pgp, db, req);
            }
        }
    })
    .catch(function (error) {
        console.log("ERROR:", error.message || error);
        res.json({
            error: true,
            message: error.message || error
        });
    });
}); // End of receivedata

app.listen(8080);

// var pg = require('pg');
// var conString = "postgres://postgres:postgre@localhost/caesguia";
// pg.connect(conString, function(err, client, done) {
//   if(err) {
//     return console.error('error fetching client from pool', err);
//   }
//   client.query('INSERT INTO teste(nome) VALUES($1)', ['Senhor Inserido'], function(err, result) {
//     //call `done()` to release the client back to the pool
//     done();
//     if(err) {
//       return console.error('error running query', err);
//     }
//   });
// });