let AWS = require( 'aws-sdk' );
let EC2 = new AWS.EC2();

module.exports = class TSGCloneDBPingerService {
  constructor ( emitter ) {
    this._emitter = emitter;
    this._emitter.on( 'connect-db-clone', ( event ) => { setTimeout( () => { this.ping( event ); }, 5000 ); } );
  }

  ping ( event ) {
    let instanceId = event.Instances[ 0 ].InstanceId;
    let instanceId2 = event.FileClone.Instances[ 0 ].InstanceId;

    EC2.describeInstances( 
      { InstanceIds: [ instanceId ] },
      ( err1, data1 ) => {
        if ( err1 ) { 
          this._emitter.emit( 'log', err1, 'clone-db-ping-error', 500 ); 
          return;
        }

        EC2.describeInstances( 
          { InstanceIds: [ instanceId2 ] },
          ( err2, data2 ) => {
            if ( err2 ) { 
              this._emitter.emit( 'log', err2, 'clone-db-ping-error', 500 ); 
              return;
            }
        
            data1.FileClone = data2;

            this._emitter.emit( 'log', data2, 'clone-db-ping-success', 200 );
            setTimeout( () => { this._emitter.emit( 'clone-db-ping-success', data1 ); } );
          }
        );
      }
    ); 
  }
}