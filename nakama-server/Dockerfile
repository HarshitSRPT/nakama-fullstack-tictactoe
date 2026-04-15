FROM registry.heroiclabs.com/heroiclabs/nakama:3.21.1

WORKDIR /nakama/data

COPY modules /nakama/data/modules
COPY railway-start.sh /nakama/data/railway-start.sh

RUN chmod +x /nakama/data/railway-start.sh

ENTRYPOINT ["bash", "/nakama/data/railway-start.sh"]