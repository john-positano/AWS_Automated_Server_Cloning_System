let EventEmitter = require( 'events' ).EventEmitter;
let CloneCreator = require( '../services/tsg-clone-creator.service' );
let CloneLogger = require( '../services/tsg-clone-logger.service' );

let CloneDBPinger = require( '../services/tsg-clone-db-pinger.service' );
let CloneDBInstaller = require( '../services/tsg-clone-db-installer.service' );
let CloneDBMysqlConfigurer = require ( '../services/tsg-clone-db-mysql-configurer.service' );
let CloneDatabaseTransferrer = require( '../services/tsg-clone-db-mysqlpump-database-transferrer.service' );

let CloneFilePinger = require( '../services/tsg-clone-file-pinger.service' );
let CloneFileLoadBalancerConfigurer = require( '../services/tsg-clone-file-load-balancer-configurer.service' );
let CloneFileInstaller = require ( '../services/tsg-clone-file-installer.service' );
let CloneFileTransferrer = require( '../services/tsg-clone-git-file-transferrer.service' );
let CloneFileDNSRegisterer = require( '../services/tsg-clone-file-dns-registerer.service' );
// let CloneFileCertificateInstaller = require( '../services/tsg-clone-file-certificate-installer.service' );
let CloneWPConfigEditor = require( '../services/tsg-clone-wp-config-editor.service' );


exports.handler = async ( event, context, callback ) => {
  let emitter = new EventEmitter();
  
  let creator = new CloneCreator( emitter );
  let logger = new CloneLogger( emitter );
  
  let dbPinger = new CloneDBPinger( emitter );
  let dbInstaller = new CloneDBInstaller( emitter );
  let dbMysqlConfigurer = new CloneDBMysqlConfigurer( emitter );
  let databaseTransferrer = new CloneDatabaseTransferrer( emitter, event ); 

  let filePinger = new CloneFilePinger( emitter );
  // let fileLoadBalancerConfigurer = new CloneFileLoadBalancerConfigurer( emitter );
  let fileInstaller = new CloneFileInstaller( emitter );
  // let fileCertificateInstaller = new CloneFileCertificateInstaller( emitter, event );
  let fileTransferrer = new CloneFileTransferrer( emitter );
  let fileDNSRegisterer = new CloneFileDNSRegisterer( emitter, event );
  let wpConfigEditor = new CloneWPConfigEditor( emitter, event );

  emitter.emit( 'create-clone', event );

  emitter.on( 
    'clone-success', 
    ( e ) => { 
      emitter.emit( 'log', e, 'clone-success', 200 ); 
      callback( null, e ); 
    } 
  );

  emitter.on( 
    'clone-error', 
    ( err ) => { 
      emitter.emit( 'log', err, 'clone-error', 500 ); 
      callback( err ); 
    } 
  );

  await new Promise( () => {} );
};